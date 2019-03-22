/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { Subject } from "rxjs"
import { BehaviorSubject } from "rxjs/BehaviorSubject"
import { Subscription } from "rxjs/Subscription"
import { Mesh, PerspectiveCamera, Vector3 } from "three"

import { NORMAL_TICKS } from "../body/fabric"
import { IAppState } from "../state/app-state"
import { ClickHandler } from "../state/click-handler"

import { EvolutionComponent } from "./evolution-component"
import { IslandComponent } from "./island-component"
import { JourneyComponent } from "./journey-component"
import { GOTCHI, GOTCHI_ARROW } from "./materials"
import { Orbit, OrbitDistance } from "./orbit"
import { MeshKey, SpotSelector } from "./spot-selector"

export const HIGH_ALTITUDE = 1000

interface IGotchiViewProps {
    perspectiveCamera: PerspectiveCamera
    width: number
    height: number
    left: number
    top: number
    appState: IAppState
    stateSubject: Subject<IAppState>
    orbitDistance: BehaviorSubject<OrbitDistance>
}

interface IGotchiViewState {
    orbitDistance: OrbitDistance
}

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private subs: Subscription[] = []
    private orbit: Orbit
    private spotSelector: SpotSelector
    private animating = true
    private target?: Vector3

    constructor(props: IGotchiViewProps) {
        super(props)
        this.props.perspectiveCamera.position.addVectors(props.appState.island.midpoint, new Vector3(0, HIGH_ALTITUDE / 2, 0))
        const orbitDistance = this.props.orbitDistance.getValue()
        this.state = {orbitDistance}
        this.spotSelector = new SpotSelector(
            this.props.perspectiveCamera,
            this.props.appState.island,
            this.props.width,
            this.props.height,
        )
    }

    public componentDidUpdate(prevProps: Readonly<IGotchiViewProps>, prevState: Readonly<IGotchiViewState>, snapshot: object): void {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.props.perspectiveCamera.aspect = this.props.width / this.props.height
            this.props.perspectiveCamera.updateProjectionMatrix()
            this.spotSelector.setSize(this.props.width, this.props.height)
        }
    }

    public componentDidMount(): void {
        const element: Element | undefined = document.getElementById("gotchi-view") || undefined
        if (element) {
            this.target = this.props.appState.island.midpoint
            this.orbit = new Orbit(element, this.props.perspectiveCamera, this.props.orbitDistance, this.target)
            this.animate()
            this.subs.push(this.props.orbitDistance.subscribe(orbitDistance => this.setState({orbitDistance})))
        }
    }

    public componentWillReceiveProps(nextProps: Readonly<IGotchiViewProps>, nextContext: object): void {
        const selectedSpot = nextProps.appState.selectedSpot
        if (selectedSpot) {
            this.target = selectedSpot.center
        } else {
            this.target = nextProps.appState.island.midpoint
        }
    }

    public componentWillUnmount(): void {
        this.animating = false
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        const islandState = this.props.appState
        const evolution = islandState.evolution
        const gotchi = islandState.gotchi
        const journey = islandState.journey
        return (
            <div id="gotchi-view" onMouseDownCapture={(event: React.MouseEvent<HTMLDivElement>) => {
                const spot = this.spotSelector.getSpot(MeshKey.SPOTS_KEY, event)
                if (spot) {
                    const props = this.props
                    const clickHandler = new ClickHandler(props.appState, this.props.stateSubject)
                    props.stateSubject.next(clickHandler.stateAfterClick(spot))
                }
            }}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.props.perspectiveCamera}>
                        <IslandComponent
                            islandState={this.props.appState}
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
                        {!journey ? undefined : (
                            <JourneyComponent journey={journey}/>
                        )}
                    </R3.Scene>
                </R3.Renderer>
            </div>
        )
    }

    // =================================================================================================================

    private animate(): void {
        const step = () => {
            setTimeout(
                () => {
                    const evolution = this.props.appState.evolution
                    if (evolution) {
                        evolution.iterate()
                        this.target = evolution.midpoint
                    }
                    const gotchi = this.props.appState.gotchi
                    if (gotchi) {
                        gotchi.iterate(NORMAL_TICKS)
                        this.target = gotchi.midpoint
                    }
                    if (this.target) {
                        this.orbit.moveTargetTowards(this.target)
                    }
                    if (this.animating) {
                        this.orbit.update()
                        this.forceUpdate()
                        requestAnimationFrame(step)
                    }
                },
                10,
            )
        }
        requestAnimationFrame(step)
    }
}

