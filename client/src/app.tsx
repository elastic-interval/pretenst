/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button } from "reactstrap"
import { PerspectiveCamera } from "three"

import { createFabricKernel, FabricKernel } from "./body/fabric-kernel"
import { Physics } from "./body/physics"
import { INITIAL_JOINT_COUNT, MAX_POPULATION } from "./gotchi/evolution"
import { Surface } from "./island/island-logic"
import { AppMode, AppTransition, IAppProps, IAppState, logString, updateDimensions } from "./state/app-state"
import { ActionsPanel } from "./view/actions-panel"
import { INITIAL_DISTANCE, MINIMUM_DISTANCE } from "./view/flight"
import { GotchiView } from "./view/gotchi-view"
import { InfoPanel } from "./view/info-panel"
import { Welcome } from "./view/welcome"

function getShowInfo(): boolean {
    return "true" === localStorage.getItem("InfoPanel.maximized")
}

function setInfoPanelMaximized(maximized: boolean): void {
    localStorage.setItem("InfoPanel.maximized", maximized ? "true" : "false")
}

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
        const showInfo = getShowInfo()
        const left = window.screenLeft
        const top = window.screenTop
        const ownedLots: string[] = []
        const mode = AppMode.Arriving
        const self = this
        this.state = {
            showInfo,
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
                    throw new Error("same nonce")
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
        return (
            <div>
                {!this.state.island ? (
                    <Welcome
                        userId={this.props.userId}
                        storage={this.props.storage}
                        fabricKernel={this.fabricKernel}
                        appState={this.state}
                    />
                ) : (
                    <div>
                        <GotchiView
                            perspectiveCamera={this.perspectiveCamera}
                            userId={this.props.userId}
                            appState={this.state}
                        />
                        <ActionsPanel
                            appState={this.state}
                            location={this.perspectiveCamera.position}
                        />
                        {this.infoPanel}
                    </div>
                )}
            </div>
        )
    }

    private get infoPanel(): JSX.Element {
        if (!this.state.showInfo) {
            return (
                <div className="info-panel-collapsed floating-panel">
                    <Button color="link" onClick={() => this.maximizeInfoPanel(true)}>?</Button>
                </div>
            )
        } else {
            return (
                <div className="info-panel floating-panel">
                    <span>Galapagotchi</span>
                    <div className="info-title">
                        <div className="info-exit">
                            <Button onClick={() => this.maximizeInfoPanel(false)}>X</Button>
                        </div>
                    </div>
                    <InfoPanel/>
                </div>
            )
        }
    }

    private maximizeInfoPanel(infoPanelMaximized: boolean): void {
        this.setState({showInfo: infoPanelMaximized})
        setInfoPanelMaximized(infoPanelMaximized)
    }

}
