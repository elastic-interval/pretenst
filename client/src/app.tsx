/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { PerspectiveCamera } from "three"

import { createFabricKernel, FabricKernel } from "./body/fabric-kernel"
import { Physics } from "./body/physics"
import { INITIAL_JOINT_COUNT, MAX_POPULATION } from "./gotchi/evolution"
import { Surface } from "./island/island-logic"
import { AppMode, AppTransition, IAppProps, IAppState, logString, updateDimensions } from "./state/app-state"
import { ControlPanel } from "./view/control-panel"
import { INITIAL_DISTANCE, MINIMUM_DISTANCE } from "./view/flight"
import { Welcome } from "./view/welcome"
import { WorldView } from "./view/world-view"

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
                const homeHexalot = appState.homeHexalot
                console.log(logString(appState))
                if (homeHexalot) {
                    const spotCenters = homeHexalot.spots.map(spot => spot.center)
                    const surface = homeHexalot.spots.map(spot => spot.surface === Surface.Land)
                    self.fabricKernel.setHexalot(spotCenters, surface)
                }
                self.setState(appState)
            },
        }
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        this.props.storage.getOwnedLots().then(ownedLots => {
            if (!ownedLots) {
                this.setState({ownedLots: []})
                return
            }
            this.setState({ownedLots})
        })
    }

    public componentWillUnmount(): void {
        window.removeEventListener("resize", () => this.setState(updateDimensions))
    }

    public render(): JSX.Element {
        if (!this.state.island) {
            return (
                <Welcome
                    userId={this.props.userId}
                    storage={this.props.storage}
                    fabricKernel={this.fabricKernel}
                    appState={this.state}
                />
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

}
