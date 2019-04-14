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
import { INITIAL_DISTANCE, MINIMUM_DISTANCE } from "./view/flight"
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
        this.perspectiveCamera = new PerspectiveCamera(50, width / height, 1, INITIAL_DISTANCE + MINIMUM_DISTANCE)
        const helpVisible = false
        const left = window.screenLeft
        const top = window.screenTop
        const ownedLots: string[] = []
        const mode = AppMode.Approaching
        const self = this
        this.state = {
            helpVisible,
            width,
            height,
            left,
            top,
            ownedLots,
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
        if (this.props.userId) {
            this.props.storage.getOwnedLots().then(ownedLots => {
                if (ownedLots && ownedLots.length > 0) {
                    this.setState({ownedLots})
                    setTimeout(() => {
                        this.fetchIsland(SINGLE_ISLAND, ownedLots[0])
                    }, 1000) // TODO: just to simulate delay
                } else {
                    this.setState({ownedLots: []})
                    setTimeout(() => {
                        this.fetchIsland(SINGLE_ISLAND)
                    }, 1000) // TODO: just to simulate delay
                }
            })
        } else {
            setTimeout(() => {
                this.fetchIsland(SINGLE_ISLAND)
            }, 1000) // TODO: just to simulate delay
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
                />
                <WorldView
                    perspectiveCamera={this.perspectiveCamera}
                    userId={this.props.userId}
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
        const island = new Island(islandData, this.fabricKernel, this.props.storage, 0)
        const appState = new Transition(this.state)
            .withIsland(island)
            .withAppMode(AppMode.Approaching)
            .withIslandIsLegal(false)
            .withRestructure
            .appState
        if (!homeHexalotId) {
            this.state.updateState(appState)
        } else {
            const homeHexalot = island.findHexalot(homeHexalotId)
            const transition = await new Transition(appState).withHomeHexalot(homeHexalot)
            this.state.updateState(transition.withRestructure.appState)
        }
    }
}
