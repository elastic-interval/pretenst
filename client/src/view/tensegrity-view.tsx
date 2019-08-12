/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { Mesh, PerspectiveCamera } from "three"
import { OrbitControls } from "three-orbitcontrols-ts"

import { IFace } from "../fabric/tensegrity-brick"
import { ITensegrityState } from "../tensegrity"

import { Flight } from "./flight"
import { TensegrityFlightState } from "./flight-state"
import { TENSEGRITY_FACE, TENSEGRITY_LINE } from "./materials"
import { MeshKey, Selector } from "./selector"
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
    private selector: Selector

    constructor(props: ITensegrityViewProps) {
        super(props)
        this.state = {iterating: true}
        this.selector = new Selector(
            this.props.perspectiveCamera,
            this.props.tensegrityState.width,
            this.props.tensegrityState.height,
        )
    }

    public componentDidUpdate(prevProps: Readonly<ITensegrityViewProps>, prevState: Readonly<object>, snapshot: object): void {
        if (prevProps.tensegrityState.width !== this.props.tensegrityState.width || prevProps.tensegrityState.height !== this.props.tensegrityState.height) {
            this.props.perspectiveCamera.aspect = this.props.tensegrityState.width / this.props.tensegrityState.height
            this.props.perspectiveCamera.updateProjectionMatrix()
            this.selector.setSize(this.props.tensegrityState.width, this.props.tensegrityState.height)
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
            this.props.tensegrityState.tensegrityFabric.iterate(1)
            this.beginAnimating()
        }
    }

    public render(): JSX.Element | undefined {
        const tensegrityState = this.props.tensegrityState
        const tensegrityFabric = this.props.tensegrityState.tensegrityFabric
        return (
            <div id="tensegrity-view" onMouseDownCapture={(event: React.MouseEvent<HTMLDivElement>) => {
                const triangle = this.selector.select<IFace>(event, MeshKey.TRIANGLES_KEY, intersections => {
                    const triangles = intersections.map(intersection => {
                        const triangleIndex = intersection.faceIndex ? intersection.faceIndex / 3 : 0
                        return this.props.tensegrityState.tensegrityFabric.findFace(triangleIndex)
                    })
                    return triangles.pop()
                })
                if (triangle) {
                    this.click(triangle)
                }
            }}>
                <R3.Renderer width={tensegrityState.width} height={tensegrityState.height}>
                    <R3.Scene width={tensegrityState.width} height={tensegrityState.height}
                              camera={this.props.perspectiveCamera}>
                        <R3.Mesh
                            key="Triangles"
                            geometry={tensegrityFabric.facesGeometry}
                            material={TENSEGRITY_FACE}
                            ref={(mesh: Mesh) => this.selector.setMesh(MeshKey.TRIANGLES_KEY, mesh)}
                        />
                        <R3.LineSegments
                            key="Lines"
                            geometry={tensegrityFabric.linesGeometry}
                            material={TENSEGRITY_LINE}/>
                        <SurfaceComponent/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        )
    }

// =================================================================================================================

    private click(triangle: IFace): void {
        console.log(`Click ${triangle.joints}`)
    }

    private beginAnimating(): void {
        const step = () => {
            setTimeout(
                () => {
                    const iterating = this.state.iterating
                    this.flight.update()
                    // this.props.tensegrityState.tensegrityFabric.iterate(1)
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

