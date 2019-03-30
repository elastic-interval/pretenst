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
import { GotchiView } from "./view/gotchi-view"
import { InfoPanel } from "./view/info-panel"
import { OrbitDistance } from "./view/orbit"
import { Welcome } from "./view/welcome"

interface IAppProps {
    fabricExports: IFabricExports
    storage: IStorage
    userId?: string
}

export interface IAppState {
    orbitDistance: OrbitDistance
    width: number
    height: number
    left: number
    top: number
    infoPanelMaximized: boolean
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

function getInfoPanelMaximized(): boolean {
    return "true" === localStorage.getItem("InfoPanel.maximized")
}

function setInfoPanelMaximized(maximized: boolean): void {
    localStorage.setItem("InfoPanel.maximized", maximized ? "true" : "false")
}

export class App extends React.Component<IAppProps, IAppState> {
    private subs: Subscription[] = []
    private perspectiveCamera: PerspectiveCamera
    private orbitDistanceSubject = new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private stateSubject = new Subject<IslandState>()
    private physics = new Physics()
    private fabricKernel: FabricKernel

    constructor(props: IAppProps) {
        super(props)
        this.physics.applyToFabric(props.fabricExports)
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        this.state = {
            infoPanelMaximized: getInfoPanelMaximized(),
            orbitDistance: this.orbitDistanceSubject.getValue(),
            width: window.innerWidth,
            height: window.innerHeight,
            left: window.screenLeft,
            top: window.screenTop,
            ownedLots: [],
        }
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000)
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        this.subs.push(this.orbitDistanceSubject.subscribe(orbitDistance => this.setState({orbitDistance})))
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
                            orbitDistance={this.orbitDistanceSubject}
                        />
                        <div className="actions-panel-outer floating-panel">
                            <div className="actions-panel-inner">
                                <ActionsPanel
                                    orbitDistance={this.orbitDistanceSubject}
                                    islandState={this.state.islandState}
                                    stateSubject={this.stateSubject}
                                    location={this.perspectiveCamera.position}
                                />
                            </div>
                        </div>
                        {this.infoPanel}
                    </div>
                )}
            </div>
        )
    }

    private get infoPanel(): JSX.Element {
        if (!this.state.infoPanelMaximized) {
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
        this.setState({infoPanelMaximized})
        setInfoPanelMaximized(infoPanelMaximized)
    }

}
