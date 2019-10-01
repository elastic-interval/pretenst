import { Request, RequestHandler, Router } from "express"
import Session from "express-session"
import HttpStatus from "http-status-codes"
import Passport, { Strategy } from "passport"
import { Strategy as TwitterStrategy } from "passport-twitter"
import { getConnection } from "typeorm"
import { SessionEntity, TypeormStore } from "typeorm-store"

import { API_ORIGIN, CLIENT_ORIGIN } from "./constants"
import { GalapaRepository } from "./galapaRepository"
import { Session as SessionModel } from "./models/session"
import { User } from "./models/user"

export function setupAuthentication(repository: GalapaRepository, app: Router): { ensureLoggedIn: RequestHandler } {
    const twitterKey = process.env.TWITTER_CONSUMER_API_KEY
    const twitterSecret = process.env.TWITTER_CONSUMER_API_SECRET
    let enabledStrategy: string
    if (twitterKey && twitterSecret) {
        Passport.use(new TwitterStrategy({
                consumerKey: twitterKey,
                consumerSecret: twitterSecret,
                callbackURL: `${API_ORIGIN}/api/auth/twitter/callback`,
            },
            async (token, tokenSecret, profile, done) => {
                try {
                    const user = await repository.findOrCreateUserByTwitterProfile(profile)
                    done(undefined, user)
                } catch (err) {
                    done(err)
                }
            },
        ))
        enabledStrategy = "twitter"
    } else {
        console.log("Missing Twitter auth envvars. Switching to fake local Twitter mode")
        Passport.use(new FakeTwitterStrategy(repository))
        attachDebugAuthRoutes(app, repository)
        enabledStrategy = "fake-twitter"
    }

    const sessionRepo = getConnection().getRepository<SessionEntity>(SessionModel)
    app.use(Session({
        store: new TypeormStore({repository: sessionRepo}),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 30 * 12, // 1 year
        },
        secret: process.env.COOKIE_SECRET || "yolo bitcoin",
    }))
    app.use(Passport.initialize())
    app.use(Passport.session())
    Passport.serializeUser((user: User, done) => {
        done(undefined, user.id)
    })

    Passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await repository.findUser(id)
            done(undefined, user)
        } catch (err) {
            done(err)
        }
    })

    app
        .get("/auth/twitter", Passport.authenticate(enabledStrategy))
        .get("/auth/twitter/callback", Passport.authenticate(enabledStrategy, {
            successRedirect: `${CLIENT_ORIGIN}/`,
            failureRedirect: "/login",
        }))
        .get("/auth/logout", (req, res) => {
            req.logout()
            res.redirect(`${CLIENT_ORIGIN}/`)
        })

    const ensureLoggedIn: RequestHandler = (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            res.sendStatus(HttpStatus.UNAUTHORIZED)
            return
        }
        next()
    }
    return {ensureLoggedIn}
}


class FakeTwitterStrategy extends Strategy {
    constructor(
        readonly repository: GalapaRepository,
    ) {
        super()
        this.name = "fake-twitter"
    }

    public async authenticate(req: Request, options?: { [k: string]: any }): Promise<void> {
        if (!options || !options.successRedirect) {
            return this.redirect("/api/auth/_choose_username")
        }
        try {
            const username = req.cookies.loginUsername
            const user = await this.repository.findUserByUsername(username)
            return this.success(user)
        } catch (e) {
            return this.error(e)
        }
    }
}

function attachDebugAuthRoutes(app: Router, repository: GalapaRepository): void {
    app
        .get("/auth/_choose_username", async (req, res) => {
            const usernames = await repository.getAllUsernames()
            const usernameElements = usernames
                .map(name =>
                    `<li><h3><a href="/api/auth/_login_username?username=${name}">${name}</a></h3></li>`,
                )
                .join("\n")
            res.send(`
                    <html lang="en">
                        <h1>Pick fake Twitter user to log in as</h1>
                        <ol>
                            ${usernameElements}
                        </ol>
                    </html>
                `)
        })
        .get("/auth/_login_username", (req, res) => {
            res.cookie("loginUsername", req.query.username)
            res.redirect("/api/auth/twitter/callback")
        })
}
