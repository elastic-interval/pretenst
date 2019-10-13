/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Alert, Badge } from "reactstrap"
import { PerspectiveCamera } from "three"

import { API_URI, DOCS_ON_GITHUB, SINGLE_ISLAND } from "./constants"
import { FabricKernel } from "./fabric/fabric-kernel"
import { Island } from "./island/island"
import { Surface } from "./island/island-logic"
import { AppMode, AppTransition, IAppProps, IAppState, updateDimensions } from "./state/app-state"
import { Transition } from "./state/transition"
import { ControlPanel } from "./view/control-panel"
import { INITIAL_DISTANCE } from "./view/flight"
import { HexalotTarget, InitialFlightState, IslandTarget } from "./view/flight-state"
import { WorldView } from "./view/world-view"
import { Gotchi, IGotchiFactory } from "./gotchi/gotchi"
import { Hexalot } from "./island/hexalot"
import { Genome } from "./genetics/genome"

export class App extends React.Component<IAppProps, IAppState> {
    private perspectiveCamera: PerspectiveCamera
    private fabricKernel: FabricKernel
    private appStateNonce = -1

    constructor(props: IAppProps) {
        super(props)
        this.fabricKernel = new FabricKernel(props.engine, props.roleFeatures)
        const width = window.innerWidth
        const height = window.innerHeight
        this.perspectiveCamera = new PerspectiveCamera(50, width / height, 1, INITIAL_DISTANCE * 1.05)
        const left = window.screenLeft
        const top = window.screenTop
        const ownedLots: string[] = []
        const self = this
        this.state = {
            width,
            height,
            left,
            top,
            ownedLots,
            flightState: InitialFlightState(),
            nonce: 0,
            appMode: AppMode.Flying,
            islandIsLegal: false,
            storage: props.storage,
            transitionState(transition: AppTransition): void {
                self.setState(transition)
            },
            updateState(appState: IAppState): void {
                if (self.appStateNonce === appState.nonce) {
                    throw new Error(`Same nonce! ${appState.nonce}`)
                }
                self.appStateNonce = appState.nonce
                // console.log(logString(appState))
                const hexalot = appState.selectedHexalot
                if (hexalot) {
                    const spotCenters = hexalot.spots.map(spot => spot.center)
                    const surface = hexalot.spots.map(spot => spot.surface === Surface.Land)
                    self.fabricKernel.setHexalot(spotCenters, surface)
                }
                self.setState(appState)
            },
        }
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        if (this.props.user) {
            const ownedLots = this.props.user!.ownedLots.map(lot => lot.id)
            if (ownedLots && ownedLots.length > 0) {
                this.setState({ownedLots})
                this.fetchIsland(SINGLE_ISLAND, ownedLots[0])
            } else {
                this.setState({ownedLots: []})
                this.fetchIsland(SINGLE_ISLAND)
            }
        } else {
            this.fetchIsland(SINGLE_ISLAND)
        }
    }

    public componentWillUnmount(): void {
        window.removeEventListener("resize", () => this.setState(updateDimensions))
    }

    public render(): JSX.Element {
        if (!this.state.island) {
            return (
                <div className="welcome">
                    <Alert color="secondary">Visiting Galapagotchi island "{SINGLE_ISLAND}"...</Alert>
                </div>
            )
        }
        return (
            <div>
                <div>
                    <div style={{
                        textAlign: "center",
                        width: "100%",
                        top: 0,
                        height: "auto",
                        position: "absolute",
                        color: "#00d1d1",
                        marginTop: 0,
                    }}>
                        <div style={{
                            float: "left",
                            height: "100%",
                            width: "auto",
                            display: "inline-flex",
                            background: "black",
                            margin: "5px",
                            padding: "4px",
                            borderColor: "inherit",
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderRadius: "10px",
                        }}>
                            {this.props.user ?
                                (
                                    <div style={{
                                        fontSize: "larger",
                                        padding: "0 6px 6px 6px",
                                    }}>
                                        <a href={`${API_URI}/auth/logout`}>
                                            <Badge color="info">@{this.props.user!.profile.username}</Badge>
                                        </a>
                                    </div>
                                )
                                :
                                (
                                    <div style={{padding: "6px"}}>
                                        <a href={`${API_URI}/auth/twitter`}>
                                            <img src="sign-in-with-twitter-gray.png"
                                                 alt="Sign in with Twitter"/>
                                        </a>
                                    </div>
                                )
                            }
                        </div>
                        <ControlPanel
                            appState={this.state}
                            location={this.perspectiveCamera.position}
                            user={this.props.user}
                        />
                        <div style={{
                            float: "right",
                            height: "100%",
                            width: "auto",
                            display: "inline-flex",
                            background: "black",
                            margin: "5px",
                            padding: "4px",
                            borderColor: "inherit",
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderRadius: "10px",
                        }}>
                            <a className="command-button btn btn-info" href={DOCS_ON_GITHUB} target="_blank">About</a>
                        </div>
                    </div>
                </div>
                <WorldView
                    perspectiveCamera={this.perspectiveCamera}
                    user={this.props.user}
                    appState={this.state}
                />
            </div>
        )
    }

    // Ok go ===========================================================================================================

    private async fetchIsland(islandName: string, homeHexalotId?: string): Promise<void> {
        const islandData = await this.props.storage.getIslandData(islandName)
        if (!islandData) {
            return
        }
        const gotchiFactory: IGotchiFactory = { // TODO
            createGotchiSeed: (home: Hexalot, rotation: number, genome: Genome): Gotchi | undefined => undefined,
            copyLiveGotchi: (gotchi: Gotchi, genome: Genome): Gotchi | undefined => undefined,
        }
        const island = new Island(islandData, gotchiFactory, this.props.storage, 0)
        const homeHexalot = homeHexalotId ? island.findHexalot(homeHexalotId) : undefined
        const flightState = homeHexalot ? HexalotTarget(homeHexalot, AppMode.Exploring) : IslandTarget(island, AppMode.Exploring)
        const appState = (await new Transition(this.state).withIsland(island, islandData)).withFlightState(flightState).withRestructure.appState
        if (!homeHexalotId) {
            this.state.updateState(appState)
        } else {
            const transition = await new Transition(appState).withHomeHexalot(homeHexalot)
            this.state.updateState(transition.withRestructure.appState)
        }
    }
}
