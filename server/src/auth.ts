import { ensureLoggedIn as makeEnsureLoggedIn } from "connect-ensure-login"
import { RequestHandler, Router } from "express"
import Session from "express-session"
import Passport from "passport"
import { Strategy as TwitterStrategy } from "passport-twitter"
import { getConnection } from "typeorm"
import { TypeormStore } from "typeorm-store"

import { API_ORIGIN, CLIENT_ORIGIN } from "./constants"
import { GalapaRepository } from "./galapaRepository"
import { Session as SessionEntity } from "./models/session"
import { User } from "./models/user"

export function setupAuthentication(repository: GalapaRepository, app: Router): {ensureLoggedIn: RequestHandler} {
    const consumerKey = process.env.TWITTER_CONSUMER_API_KEY!
    const consumerSecret = process.env.TWITTER_CONSUMER_API_SECRET!
    if (!consumerKey || !consumerSecret) {
        console.error("Missing envvars: TWITTER_CONSUMER_API_KEY or TWITTER_CONSUMER_API_SECRET")
        process.exit(1)
    }
    const callbackURL = `${API_ORIGIN}/api/auth/twitter/callback`
    Passport.use(new TwitterStrategy({
            consumerKey,
            consumerSecret,
            callbackURL,
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

    const sessionRepo = getConnection().getRepository(SessionEntity)
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
        .get("/auth/twitter", Passport.authenticate("twitter"))
        .get("/auth/logout", (req, res) => {
            req.logout()
            res.redirect(`${CLIENT_ORIGIN}/`)
        })
        .get("/auth/twitter/callback", Passport.authenticate("twitter", {
            successRedirect: `${CLIENT_ORIGIN}/`,
            failureRedirect: "/login",
        }))

    const ensureLoggedIn = makeEnsureLoggedIn("/api/auth/twitter")
    return {ensureLoggedIn}
}
