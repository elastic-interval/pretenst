/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Alert } from "reactstrap"
import { PerspectiveCamera } from "three"

import { createFabricKernel, FabricKernel } from "./body/fabric-kernel"
import { Physics } from "./body/physics"
import { INITIAL_JOINT_COUNT, MAX_POPULATION } from "./gotchi/evolution"
import { Island } from "./island/island"
import { Surface } from "./island/island-logic"
import { AppMode, AppTransition, IAppProps, IAppState, logString, updateDimensions } from "./state/app-state"
import { Transition } from "./state/transition"
import { ControlPanel } from "./view/control-panel"
import { INITIAL_DISTANCE } from "./view/flight"
import { HexalotTarget, IslandTarget, UnknownTarget } from "./view/flight-target"
import { WorldView } from "./view/world-view"

const SINGLE_ISLAND = "rotterdam"

export class App extends React.Component<IAppProps, IAppState> {
    private perspectiveCamera: PerspectiveCamera
    private physics = new Physics()
    private fabricKernel: FabricKernel
    private appStateNonce = -1

    constructor(props: IAppProps) {
        super(props)
        this.physics.applyToFabric(props.fabricExports)
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        const width = window.innerWidth
        const height = window.innerHeight
        this.perspectiveCamera = new PerspectiveCamera(50, width / height, 1, INITIAL_DISTANCE * 1.05)
        const left = window.screenLeft
        const top = window.screenTop
        const ownedLots: string[] = []
        const mode = AppMode.Flying
        const flightTarget = UnknownTarget()
        const self = this
        this.state = {
            width,
            height,
            left,
            top,
            ownedLots,
            flightTarget,
            nonce: 0,
            appMode: mode,
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
                console.log(logString(appState))
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
                    <h1>Galapagotchi</h1>
                    <hr/>
                    <img alt="logo" src="logo.png"/>
                    <hr/>
                    <Alert color="secondary">Loading island "{SINGLE_ISLAND}"...</Alert>
                </div>
            )
        }
        return (
            <div>
                <ControlPanel
                    appState={this.state}
                    location={this.perspectiveCamera.position}
                    user={this.props.user}
                />
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
        console.log("Fetched island", islandData)
        const island = new Island(islandData, this.fabricKernel, this.props.storage, 0)
        const homeHexalot = homeHexalotId ? island.findHexalot(homeHexalotId) : undefined
        const flightTarget = homeHexalot ? HexalotTarget(homeHexalot, AppMode.Exploring) : IslandTarget(island, AppMode.Exploring)
        const appState = (await new Transition(this.state).withIsland(island, islandData, flightTarget)).withRestructure.appState
        if (!homeHexalotId) {
            this.state.updateState(appState)
        } else {
            const transition = await new Transition(appState).withHomeHexalot(homeHexalot)
            this.state.updateState(transition.withRestructure.appState)
        }
    }
}
