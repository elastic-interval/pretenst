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
import { Island } from "./island/island"
import { Surface } from "./island/island-logic"
import { IAppState, logString } from "./state/app-state"
import { Transition } from "./state/transition"
import { IStorage } from "./storage/storage"
import { ActionsPanel } from "./view/actions-panel"
import { GotchiView } from "./view/gotchi-view"
import { InfoPanel } from "./view/info-panel"
import { OrbitDistance } from "./view/orbit"

interface IAppProps {
    fabricExports: IFabricExports
    storage: IStorage
    userId?: string
}

export interface IGalapagotchiState {
    orbitDistance: OrbitDistance
    width: number
    height: number
    left: number
    top: number
    infoPanelMaximized: boolean
    ownedLots: string[]
    appState?: IAppState
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

export class Galapagotchi extends React.Component<IAppProps, IGalapagotchiState> {
    private subs: Subscription[] = []
    private perspectiveCamera: PerspectiveCamera
    private orbitDistanceSubject = new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private stateSubject = new Subject<IAppState>()
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
        this.subs.push(this.stateSubject.subscribe(appState => {
            const homeHexalot = appState.homeHexalot
            if (homeHexalot) {
                const spotCenters = homeHexalot.spots.map(spot => spot.center)
                const surface = homeHexalot.spots.map(spot => spot.surface === Surface.Land)
                this.fabricKernel.setHexalot(spotCenters, surface)
            }
            this.setState({appState})
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
                {!this.state.appState ? this.noIsland : (
                    <div>
                        <GotchiView
                            perspectiveCamera={this.perspectiveCamera}
                            appState={this.state.appState}
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
                                    appState={this.state.appState}
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

    private get noIsland(): JSX.Element {
        return (
            <div className="no-island">
                <h3>Welcome to Galapagotchi</h3>
                {this.props.userId ? (
                    <div>
                        <p>{this.props.userId}</p>
                        {this.state.ownedLots ? this.ownedLots : <h5>Checking lots</h5>}
                    </div>
                ) : (
                    <div>
                        <Button onClick={() => this.fetch()}>Visit the island</Button>
                    </div>
                )}
            </div>
        )
    }

    private get ownedLots(): JSX.Element {
        if (this.state.ownedLots.length === 0) {
            return (
                <div>
                    <h5>You don't own a lot yet</h5>
                    <Button onClick={() => this.fetch()}>Go claim one</Button>
                </div>
            )
        }
        return (
            <div>
                {this.state.ownedLots.map(lot => {
                    return <div key={lot}><Button onClick={() => this.fetch(lot)}>Visit your lot {lot}</Button><br/></div>
                })}
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

    private async fetch(homeHexalotId?: string): Promise<void> {
        return this.fetchIsland("rotterdam", homeHexalotId)
    }

    private async fetchIsland(islandName: string, homeHexalotId?: string): Promise<void> {
        const islandData = await this.props.storage.getIslandData(islandName)
        if (!islandData) {
            return
        }
        const island = new Island(islandData, this.fabricKernel, this.props.storage, 0)
        console.log(logString(island.state))
        const homeHexalot = homeHexalotId ? island.findHexalot(homeHexalotId) : undefined
        if (homeHexalot) {
            this.stateSubject.next((await new Transition(island.state).withHomeHexalot(homeHexalot)).state)
        } else {
            this.stateSubject.next(island.state)
        }
    }
}
