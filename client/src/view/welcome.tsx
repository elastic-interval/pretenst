/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button, Col, Container, Row } from "reactstrap"
import { Subject } from "rxjs"

import { FabricKernel } from "../body/fabric-kernel"
import { Island } from "../island/island"
import { IAppState, logString } from "../state/app-state"
import { Transition } from "../state/transition"
import { IStorage } from "../storage/storage"

const GITHUB = "https://github.com/beautiful-code-bv/galapagotchi"
const GITTER = "https://gitter.im/galapagotchis/community"
const GMAIL = "galapagotchi@gmail.com"
const TWITTER = "https://twitter.com/galapagotchi"
const WEBASSEMBLY = "https://webassembly.org/"
const WEBGL = "https://en.wikipedia.org/wiki/WebGL"
const THREEJS = "https://threejs.org/"
const DARWINS_DANGEROUS_IDEA = "https://en.wikipedia.org/wiki/Darwin%27s_Dangerous_Idea"

interface IRef {
    href: string
    text: string
}

function Ref(props: IRef): JSX.Element {
    return <span> <a href={props.href} target="_blank">{props.text}</a> </span>
}

export interface IWelcomeProps {
    userId?: string
    storage: IStorage
    fabricKernel: FabricKernel
    stateSubject: Subject<IAppState>
    ownedLots: string[]
}

export interface IWelcomeState {
    developer?: boolean
}

export class Welcome extends React.Component<IWelcomeProps, IWelcomeState> {

    constructor(props: IWelcomeProps) {
        super(props)
        this.state = {developer: false}
    }

    public render(): JSX.Element {
        return (
            <div className="welcome">{this.page}</div>
        )
    }

    private get page(): JSX.Element {
        if (this.props.userId) {
            return this.welcomeBack
        }
        if (this.state.developer) {
            return this.welcomeDeveloper
        }
        return this.welcomeN00b
    }

    // N00b ============================================================================================================

    private get welcomeN00b(): JSX.Element {
        return (
            <div>
                <h3>Welcome to the Galapagotchi project!</h3>
                <img src="logo.png"/>
                <p>
                    It appears that this is your first visit, at least with this web browser.
                </p>
                <p>
                    This project aims to give you a fascinating experience that shows you
                    how things can evolve by Darwin's natural selection.
                </p>
                <p>
                    You are taken to an imaginary island where you can see inside of a toy world,
                    with toy physics, and you can evolve little robots to run.
                </p>
                <Button onClick={() => this.fetch()}>Come for a visit</Button>
                <br/>
                <br/>
                <p>
                    This is a very early alpha release of the Galapagotchi universe,
                    but if you want to join in, create your own evolving Galapagotchi and start evolving,
                    contact us and we will send you a key.
                </p>
                <p>
                    <strong>{GMAIL}</strong>
                </p>
                <p>
                    Follow the project on Twitter <Ref href={TWITTER} text="@galapagotchi"/>
                </p>
                <p>
                    <Button onClick={() => this.setState({developer: true})}>I am a developer!</Button>
                </p>
            </div>
        )
    }

    // Permissioned user ===============================================================================================

    private get welcomeBack(): JSX.Element {
        return (
            <div>
                <h3>Welcome back to Galapagotchi!</h3>
                <img src="logo.png"/>
                <br/>
                <br/>
                <p>
                    You are known to us as <i>"{this.props.userId}"</i>,
                    and this information is stored in your web browser.
                </p>
                <div>
                    {this.props.ownedLots ? this.ownedLots : (
                        <span>One moment please. Checking if you own a hexalot.</span>
                    )}
                </div>
            </div>
        )
    }

    private get ownedLots(): JSX.Element {
        if (this.props.ownedLots.length === 0) {
            return (
                <div>
                    <p>
                        It seems that you don't yet own a hexalot.
                    </p>
                    <p>
                        You can visit the island and claim your new hexalot
                        but remember, every new hexalot creates a little bit more virgin territory.
                    </p>
                    <p>
                        It's your job to terraform the new part of the island before you can claim a home there.
                        Terraforming is done with hexagonal spots of land and water.
                        It has to follow certain rules:
                    </p>
                    <p>
                        There always has to be a land path to the edge of the island,
                        and land spot needs to touch two land spots.
                        Also, neither water nor land can be surrounded by its own kind.
                        That's all.
                    </p>
                    <p>
                        <Button onClick={() => this.fetch()}>Ok go!</Button>
                    </p>
                </div>
            )
        }
        return (
            <div>
                <p>
                    You can visit your gotchi on your home hexalot, evolve it, or take it for a run.
                </p>
                <p>
                    Until your gotchi has evolved the ability to run around, you will have to take the time to
                    evolve its body shape and muscle coordination.
                </p>
                {this.props.ownedLots.map(lot => {
                    return (
                        <p key={lot}>
                            <Button onClick={() => this.fetch(lot)}>Go to hexalot "{lot}"</Button>
                            <br/><br/>
                        </p>
                    )
                })}
                <p>
                    We're still figuring out how to make this into a game, but many of the parts are in place.
                </p>
                <p>
                    Follow the project on Twitter <Ref href={TWITTER} text="@galapagotchi"/> if you want to know more.
                </p>
            </div>
        )
    }

    private get welcomeDeveloper(): JSX.Element {
        return (
            <div>
                <h3>Welcome developers!</h3>
                <img src="logo.png"/>
                <br/>
                <br/>
                <p>
                    You've come to the right place if you are interested in
                    <br/>
                    <br/>
                    <Ref href={WEBASSEMBLY} text="WebAssembly"/>
                    <br/>
                    <Ref href={THREEJS} text="ThreeJS"/>
                    <br/>
                    <Ref href={WEBGL} text="WebGL"/>
                    <br/>
                    <Ref href={DARWINS_DANGEROUS_IDEA} text="Darwin's Evolution"/>
                </p>
                <p>
                    Join

                    <Ref href={GITTER} text="the gitter community"/>

                    or explore

                    <Ref href={GITHUB} text="the github project"/>.
                </p>
                <Container>
                    <Row>
                        <Col>
                            <img src="wa.png"/>
                        </Col>
                        <Col>
                            <img src="cd.jpg"/>
                        </Col>
                    </Row>
                </Container>
            </div>
        )
    }

    // Ok go ===========================================================================================================

    private async fetch(homeHexalotId?: string): Promise<void> {
        return this.fetchIsland("rotterdam", homeHexalotId)
    }

    private async fetchIsland(islandName: string, homeHexalotId?: string): Promise<void> {
        const islandData = await this.props.storage.getIslandData(islandName)
        if (!islandData) {
            return
        }
        const island = new Island(islandData, this.props.fabricKernel, this.props.storage, 0)
        console.log(logString(island.state))
        if (!homeHexalotId) {
            this.props.stateSubject.next(island.state)
        } else {
            const homeHexalot = island.findHexalot(homeHexalotId)
            const transition = await new Transition(island.state).withHomeHexalot(homeHexalot)
            const newState = transition.withRestructure.state
            this.props.stateSubject.next(newState)
        }
    }
}
