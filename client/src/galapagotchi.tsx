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
import { Surface } from "./island/spot"
import { IAppState, logString } from "./state/app-state"
import { IStorage } from "./storage/storage"
import { ActionsPanel } from "./view/actions-panel"
import { GotchiView } from "./view/gotchi-view"
import { InfoPanel } from "./view/info-panel"
import { OrbitDistance } from "./view/orbit"

interface IAppProps {
    fabricExports: IFabricExports
    storage: IStorage
}

export interface IGalapagotchiState {
    orbitDistance: OrbitDistance
    width: number
    height: number
    left: number
    top: number
    infoPanel: boolean
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
            infoPanel: getInfoPanelMaximized(),
            orbitDistance: this.orbitDistanceSubject.getValue(),
            width: window.innerWidth,
            height: window.innerHeight,
            left: window.screenLeft,
            top: window.screenTop,
        }
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000)
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        this.subs.push(this.orbitDistanceSubject.subscribe(orbitDistance => this.setState({orbitDistance})))
        this.subs.push(this.stateSubject.subscribe(appState => {
            const homeHexalot = appState.homeHexalot
            if (homeHexalot) {
                location.replace(`/#/${homeHexalot.id}`)
                const spotCenters = homeHexalot.spots.map(spot => spot.center)
                const surface = homeHexalot.spots.map(spot => spot.surface === Surface.Land)
                this.fabricKernel.setHexalot(spotCenters, surface)
            } else {
                location.replace("/#/")
            }
            this.setState({appState})
        }))
        this.fetchIsland("rotterdam")
    }

    public componentWillUnmount(): void {
        window.removeEventListener("resize", () => this.setState(updateDimensions))
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        return (
            <div className="everything">
                {this.state.appState ? (
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
                ) : (
                    <h1>No island!</h1>
                )}
                {!this.state.infoPanel ? (
                    <div className="info-panel-collapsed floating-panel">
                        <Button color="link" onClick={() => {
                            this.setState({infoPanel: true})
                            setInfoPanelMaximized(true)
                        }}>?</Button>
                    </div>
                ) : (
                    <div className="info-panel floating-panel">
                        <span>Galapagotchi</span>
                        <div className="info-title">
                            <div className="info-exit">
                                <Button onClick={() => {
                                    this.setState({infoPanel: false})
                                    setInfoPanelMaximized(false)
                                }}>X</Button>
                            </div>
                        </div>
                        <InfoPanel/>
                    </div>
                )}
                {this.state.appState ? (
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
                ) : (
                    <h1>No island!</h1>
                )}
            </div>
        )
    }

    private fetchIsland(islandName: string): void {
        this.props.storage.getIslandData(islandName).then(islandData => {
            if (!islandData) {
                return
            }
            const island = new Island(islandData, this.fabricKernel, this.props.storage, this.stateSubject, 0)
            console.log(logString(island.state))
            this.stateSubject.next(island.state)
        })
    }
}

export default Galapagotchi
