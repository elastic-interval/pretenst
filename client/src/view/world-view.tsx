/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { Mesh, PerspectiveCamera, Vector3 } from "three"
import { OrbitControls } from "three-orbitcontrols-ts"

import { NORMAL_TICKS } from "../body/fabric"
import { Direction } from "../body/fabric-exports"
import { Spot } from "../island/spot"
import { IAppState } from "../state/app-state"
import { ClickHandler } from "../state/click-handler"

import { EvolutionComponent } from "./evolution-component"
import { Flight } from "./flight"
import { IslandComponent } from "./island-component"
import { JourneyComponent } from "./journey-component"
import { GOTCHI, GOTCHI_ARROW } from "./materials"
import { MeshKey, SpotSelector } from "./spot-selector"

interface IWorldProps {
    perspectiveCamera: PerspectiveCamera
    userId?: string
    appState: IAppState
}

interface IWorldState {
    iterating: boolean
}

export class WorldView extends React.Component<IWorldProps, IWorldState> {
    private appStateNonce = -1
    private flight: Flight
    private spotSelector: SpotSelector
    private target?: Vector3

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
            const appState = props.appState
            if (appState.homeHexalot) {
                this.target = appState.homeHexalot.seed
            } else if (appState.island) {
                this.target = appState.island.midpoint
            } else {
                this.target = new Vector3()
            }
            const orbitControls = new OrbitControls(props.perspectiveCamera, element)
            this.flight = new Flight(orbitControls, this.target)
            this.flight.setupCamera()
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
        const gotchi = jockey ? jockey.gotchi : undefined
        const journey = appState.journey
        if (appState.nonce > this.appStateNonce) {
            this.appStateNonce = appState.nonce
            const iterating = !!jockey || !!evolution
            if (this.state.iterating !== iterating) {
                setTimeout(() => { // todo: this must be a cheat
                    this.setState({iterating})
                })
            }
            const selectedHexalot = appState.selectedHexalot
            const selectedSpot = appState.selectedSpot
            if (selectedHexalot) {
                this.target = selectedHexalot.seed
            } else if (selectedSpot) {
                this.target = selectedSpot.center
            } else {
                this.target = island.midpoint
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
                            userId={this.props.userId}
                            appState={appState}
                            setMesh={(key: MeshKey, node: Mesh) => this.spotSelector.setMesh(key, node)}
                        />
                        {!evolution ? undefined : (
                            <EvolutionComponent evolution={evolution}/>)
                        }
                        {!gotchi ? undefined : (
                            <R3.Object3D key="Gotchi">
                                <R3.LineSegments
                                    key="Vectors"
                                    geometry={gotchi.fabric.pointerGeometryFor(gotchi.fabric.currentDirection)}
                                    material={GOTCHI_ARROW}
                                />
                                <R3.Mesh
                                    geometry={gotchi.fabric.facesGeometry}
                                    material={GOTCHI}
                                />
                            </R3.Object3D>
                        )}
                        {!journey ? console.log("journey null") : (
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
        const clickHandler = new ClickHandler(appState, props.userId)
        const afterClick = await clickHandler.stateAfterClick(spot)
        props.appState.updateState(afterClick)
    }

    private beginAnimating(): void {
        const step = () => {
            setTimeout(
                () => {
                    const appState = this.props.appState
                    const jockey = appState.jockey
                    if (jockey) {
                        if (jockey.touchedDestination) {
                            const nextLeg = jockey.leg.nextLeg
                            if (nextLeg) {
                                jockey.leg = nextLeg
                            } else {
                                jockey.gotchi.nextDirection = Direction.REST
                            }
                        } else if (jockey.gotchi.currentDirection !== Direction.REST) {
                            jockey.adjustDirection()
                        }
                    }
                    const gotchi = jockey ? jockey.gotchi : undefined
                    const iterating = this.state.iterating
                    if (gotchi) {
                        gotchi.iterate(NORMAL_TICKS)
                        this.target = gotchi.midpoint
                        if (!iterating) {
                            this.setState({iterating: true})
                        }
                    }
                    const evolution = appState.evolution
                    if (evolution) {
                        evolution.iterate()
                        this.target = evolution.midpoint
                        if (!iterating) {
                            this.setState({iterating: true})
                        }
                    }
                    this.flight.update(appState, this.target)
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

