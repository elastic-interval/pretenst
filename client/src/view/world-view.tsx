/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { Mesh, PerspectiveCamera } from "three"
import { OrbitControls } from "three-orbitcontrols-ts"

import { APP_EVENT, AppEvent } from "../app-event"
import { ITERATIONS_PER_TICK } from "../fabric/gotchi-body"
import { Spot } from "../island/spot"
import { AppMode, IAppState } from "../state/app-state"
import { ClickHandler } from "../state/click-handler"
import { IUser } from "../storage/remote-storage"

import { EvolutionComponent } from "./evolution-component"
import { Flight } from "./flight"
import { InitialFlightState } from "./flight-state"
import { IslandComponent } from "./island-component"
import { JourneyComponent } from "./journey-component"
import { GOTCHI, GOTCHI_ARROW } from "./materials"
import { MeshKey, SpotSelector } from "./spot-selector"

interface IWorldProps {
    perspectiveCamera: PerspectiveCamera
    user?: IUser
    appState: IAppState
}

interface IWorldState {
    iterating: boolean
}

export class WorldView extends React.Component<IWorldProps, IWorldState> {
    private appStateNonce = -1
    private flight: Flight
    private spotSelector: SpotSelector
    private appMode = AppMode.Flying

    constructor(props: IWorldProps) {
        super(props)
        this.state = {iterating: false}
        this.spotSelector = new SpotSelector(
            this.props.perspectiveCamera,
            this.props.appState.width,
            this.props.appState.height,
        )
    }

    public componentDidUpdate(prevProps: Readonly<IWorldProps>, prevState: Readonly<object>, snapshot: object): void {
        if (prevProps.appState.width !== this.props.appState.width || prevProps.appState.height !== this.props.appState.height) {
            this.props.perspectiveCamera.aspect = this.props.appState.width / this.props.appState.height
            this.props.perspectiveCamera.updateProjectionMatrix()
            this.spotSelector.setSize(this.props.appState.width, this.props.appState.height)
        }
    }

    public componentDidMount(): void {
        const props = this.props
        const element: HTMLElement | undefined = document.getElementById("gotchi-view") || undefined
        if (element) {
            const orbitControls = new OrbitControls(props.perspectiveCamera, element)
            this.flight = new Flight(orbitControls)
            this.flight.setupCamera(InitialFlightState())
            this.beginAnimating()
        }
    }

    public render(): JSX.Element | undefined {
        const appState = this.props.appState
        const island = appState.island
        if (!island) {
            return undefined
        }
        const evolution = appState.evolution
        const jockey = appState.jockey
        const journey = appState.journey
        if (appState.nonce > this.appStateNonce) {
            this.appStateNonce = appState.nonce
            const iterating = !!jockey || !!evolution
            if (this.state.iterating !== iterating) {
                setTimeout(() => { // todo: this must be a cheat
                    this.setState({iterating})
                })
            }
        }
        return (
            <div id="gotchi-view" onMouseDownCapture={(event: React.MouseEvent<HTMLDivElement>) => {
                const spot = this.spotSelector.getSpot(island, MeshKey.SPOTS_KEY, event)
                if (spot) {
                    this.click(spot)
                }
            }}>
                <R3.Renderer width={appState.width} height={appState.height}>
                    <R3.Scene width={appState.width} height={appState.height} camera={this.props.perspectiveCamera}>
                        <IslandComponent
                            user={this.props.user}
                            appState={appState}
                            setMesh={(key: MeshKey, node: Mesh) => this.spotSelector.setMesh(key, node)}
                        />
                        {!evolution ? undefined : (
                            <EvolutionComponent evolution={evolution}/>)
                        }
                        {!jockey ? undefined : (
                            <R3.Object3D key="Gotchi">
                                <R3.LineSegments
                                    key="Vectors"
                                    geometry={jockey.pointerGeometry}
                                    material={GOTCHI_ARROW}
                                />
                                <R3.Mesh
                                    geometry={jockey.facesGeometry}
                                    material={GOTCHI}
                                />
                            </R3.Object3D>
                        )}
                        {!journey ? undefined : (
                            <JourneyComponent journey={journey}/>
                        )}
                    </R3.Scene>
                </R3.Renderer>
            </div>
        )
    }

// =================================================================================================================

    private async click(spot: Spot): Promise<void> {
        const props = this.props
        const appState = props.appState
        const clickHandler = new ClickHandler(appState, props.user)
        const afterClick = await clickHandler.stateAfterClick(spot)
        props.appState.updateState(afterClick)
    }

    private beginAnimating(): void {
        const step = () => {
            setTimeout(
                () => {
                    const appState = this.props.appState
                    if (appState.appMode !== this.appMode) {
                        this.appMode = appState.appMode
                        APP_EVENT.next({event: AppEvent.AppMode, appMode: this.appMode})
                    }
                    const jockey = appState.jockey
                    if (jockey) {
                        jockey.reorient()
                    }
                    const iterating = this.state.iterating
                    if (jockey) {
                        const appEvent = jockey.gotchi.iterate(ITERATIONS_PER_TICK)
                        if (appEvent) {
                            APP_EVENT.next({event: appEvent})
                        }
                        if (!iterating) {
                            this.setState({iterating: true})
                        }
                    }
                    const evolution = appState.evolution
                    if (evolution) {
                        evolution.iterate()
                        if (!iterating) {
                            this.setState({iterating: true})
                        }
                    }
                    this.flight.update(appState)
                    if (iterating) {
                        this.forceUpdate()
                    }
                    requestAnimationFrame(step)
                },
                10,
            )
        }
        requestAnimationFrame(step)
    }
}

