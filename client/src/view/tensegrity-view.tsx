/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { Mesh, PerspectiveCamera } from "three"
import { OrbitControls } from "three-orbitcontrols-ts"

import { ITensegrityState } from "../tensegrity"

import { Flight } from "./flight"
import { TensegrityFlightState } from "./flight-state"
import { TENSEGRITY } from "./materials"
import { MeshKey, SpotSelector } from "./spot-selector"
import { SurfaceComponent } from "./surface-component"

interface ITensegrityViewProps {
    perspectiveCamera: PerspectiveCamera
    tensegrityState: ITensegrityState
}

interface ITensegrityViewState {
    iterating: boolean
}

export class TensegrityView extends React.Component<ITensegrityViewProps, ITensegrityViewState> {
    private flight: Flight
    private spotSelector: SpotSelector

    constructor(props: ITensegrityViewProps) {
        super(props)
        this.state = {iterating: true}
        this.spotSelector = new SpotSelector(
            this.props.perspectiveCamera,
            this.props.tensegrityState.width,
            this.props.tensegrityState.height,
        )
    }

    public componentDidUpdate(prevProps: Readonly<ITensegrityViewProps>, prevState: Readonly<object>, snapshot: object): void {
        if (prevProps.tensegrityState.width !== this.props.tensegrityState.width || prevProps.tensegrityState.height !== this.props.tensegrityState.height) {
            this.props.perspectiveCamera.aspect = this.props.tensegrityState.width / this.props.tensegrityState.height
            this.props.perspectiveCamera.updateProjectionMatrix()
            this.spotSelector.setSize(this.props.tensegrityState.width, this.props.tensegrityState.height)
        }
    }

    public componentDidMount(): void {
        const props = this.props
        const element: HTMLElement | undefined = document.getElementById("tensegrity-view") || undefined
        if (element) {
            const orbitControls = new OrbitControls(props.perspectiveCamera, element)
            this.flight = new Flight(orbitControls)
            this.flight.setupCamera(TensegrityFlightState())
            this.flight.enabled = true
            this.beginAnimating()
        }
    }

    public render(): JSX.Element | undefined {
        const tensegrityState = this.props.tensegrityState
        return (
            <div id="tensegrity-view">
                <R3.Renderer width={tensegrityState.width} height={tensegrityState.height}>
                    <R3.Scene width={tensegrityState.width} height={tensegrityState.height}
                              camera={this.props.perspectiveCamera}>
                        <R3.Mesh key="Tensegrity"
                                 geometry={this.props.tensegrityState.tensegrityFabric.facesGeometry}
                                 material={TENSEGRITY}
                        />
                        <SurfaceComponent
                            setMesh={(key: MeshKey, node: Mesh) => this.spotSelector.setMesh(key, node)}
                        />
                    </R3.Scene>
                </R3.Renderer>
            </div>
        )
    }

// =================================================================================================================

    private beginAnimating(): void {
        const step = () => {
            setTimeout(
                () => {
                    const iterating = this.state.iterating
                    this.flight.update()
                    if (iterating) {
                        this.forceUpdate()
                    }
                    requestAnimationFrame(step)
                },
                100,
            )
        }
        requestAnimationFrame(step)
    }
}

