/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button } from "reactstrap"
import { Subject } from "rxjs"
import { BehaviorSubject } from "rxjs/BehaviorSubject"
import { Subscription } from "rxjs/Subscription"
import { PerspectiveCamera } from "three"

import { IFabricExports } from "./body/fabric-exports"
import { createFabricKernel, FabricKernel } from "./body/fabric-kernel"
import { Physics } from "./body/physics"
import { INITIAL_JOINT_COUNT, MAX_POPULATION } from "./gotchi/evolution"
import { Surface } from "./island/island-logic"
import { IslandState } from "./state/island-state"
import { IStorage } from "./storage/storage"
import { ActionsPanel } from "./view/actions-panel"
import { FlightMode, INITIAL_DISTANCE, MINIMUM_DISTANCE } from "./view/flight"
import { GotchiView } from "./view/gotchi-view"
import { InfoPanel } from "./view/info-panel"
import { Welcome } from "./view/welcome"

interface IAppProps {
    fabricExports: IFabricExports
    storage: IStorage
    userId?: string
}

export interface IAppState {
    flightMode: FlightMode
    width: number
    height: number
    left: number
    top: number
    showInfo: boolean
    ownedLots: string[]
    islandState?: IslandState
}

function updateDimensions(): object {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        left: window.screenLeft,
        top: window.screenTop,
    }
}

function getShowInfo(): boolean {
    return "true" === localStorage.getItem("InfoPanel.maximized")
}

function setInfoPanelMaximized(maximized: boolean): void {
    localStorage.setItem("InfoPanel.maximized", maximized ? "true" : "false")
}

export class App extends React.Component<IAppProps, IAppState> {
    private subs: Subscription[] = []
    private perspectiveCamera: PerspectiveCamera
    private flightMode = new BehaviorSubject<FlightMode>(FlightMode.Arriving)
    private stateSubject = new Subject<IslandState>()
    private physics = new Physics()
    private fabricKernel: FabricKernel

    constructor(props: IAppProps) {
        super(props)
        this.physics.applyToFabric(props.fabricExports)
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        const width = window.innerWidth
        const height = window.innerHeight
        this.perspectiveCamera = new PerspectiveCamera(50, width / height, MINIMUM_DISTANCE, INITIAL_DISTANCE + MINIMUM_DISTANCE)
        const showInfo = getShowInfo()
        const flightMode = this.flightMode.getValue()
        const left = window.screenLeft
        const top = window.screenTop
        const ownedLots: string[] = []
        this.state = {showInfo, flightMode, width, height, left, top, ownedLots}
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        this.subs.push(this.flightMode.subscribe(flightMode => this.setState({flightMode})))
        this.subs.push(this.stateSubject.subscribe(islandState => {
            const homeHexalot = islandState.homeHexalot
            if (homeHexalot) {
                const spotCenters = homeHexalot.spots.map(spot => spot.center)
                const surface = homeHexalot.spots.map(spot => spot.surface === Surface.Land)
                this.fabricKernel.setHexalot(spotCenters, surface)
            }
            this.setState({islandState})
        }))
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
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        return (
            <div>
                {!this.state.islandState ? (
                    <Welcome
                        userId={this.props.userId}
                        ownedLots={this.state.ownedLots}
                        storage={this.props.storage}
                        fabricKernel={this.fabricKernel}
                        stateSubject={this.stateSubject}
                    />
                ) : (
                    <div>
                        <GotchiView
                            perspectiveCamera={this.perspectiveCamera}
                            userId={this.props.userId}
                            islandState={this.state.islandState}
                            stateSubject={this.stateSubject}
                            width={this.state.width}
                            height={this.state.height}
                            left={this.state.left}
                            top={this.state.top}
                            flightMode={this.flightMode}
                        />
                        <ActionsPanel
                            flightMode={this.flightMode}
                            islandState={this.state.islandState}
                            stateSubject={this.stateSubject}
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
