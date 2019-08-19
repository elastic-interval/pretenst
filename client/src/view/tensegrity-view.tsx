/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Canvas } from "react-three-fiber"

import { ITensegrityState } from "../tensegrity"

import { TENSEGRITY_FACE, TENSEGRITY_LINE } from "./materials"
import { SurfaceComponent } from "./surface-component"

interface ITensegrityViewProps {
    tensegrityState: ITensegrityState
}

interface ITensegrityViewState {
    iterating: boolean
}

export class TensegrityView extends React.Component<ITensegrityViewProps, ITensegrityViewState> {
    // private flight: Flight
    // private selector: Selector

    constructor(props: ITensegrityViewProps) {
        super(props)
        this.state = {iterating: true}
    }

    // public componentDidUpdate(prevProps: Readonly<ITensegrityViewProps>, prevState: Readonly<object>, snapshot: object): void {
    //     if (prevProps.tensegrityState.width !== this.props.tensegrityState.width || prevProps.tensegrityState.height !== this.props.tensegrityState.height) {
    //         this.selector.setSize(this.props.tensegrityState.width, this.props.tensegrityState.height)
    //     }
    // }

    public componentDidMount(): void {
        // const {camera} = useThree()
        // const orbitControls = new OrbitControls(camera)
        // this.flight = new Flight(orbitControls)
        // this.flight.setupCamera(TensegrityFlightState())
        // this.flight.enabled = true
        // this.selector = new Selector(
        //     camera,
        //     this.props.tensegrityState.width,
        //     this.props.tensegrityState.height,
        // )
        this.beginAnimating()
    }

    public render(): JSX.Element | undefined {
        const state = this.props.tensegrityState
        const fabric = state.fabric
        // const onMouseDownCapture = (event: React.MouseEvent<HTMLDivElement>) => {
        //     if (!event.shiftKey) {
        //         return
        //     }
        //     const closestFace = this.selector.select<IFace>(event, MeshKey.TRIANGLES_KEY, intersections => {
        //         const faces = intersections.map(intersection => {
        //             const triangleIndex = intersection.faceIndex ? intersection.faceIndex / 3 : 0
        //             const foundFace = fabric.findFace(triangleIndex)
        //             if (!foundFace) {
        //                 throw new Error()
        //             }
        //             return foundFace
        //         })
        //         const cameraPosition = this.flight.cameraPosition
        //         const midpoint = (face: IFace): Vector3 => {
        //             return face.joints.reduce((mid: Vector3, joint: Joint) =>
        //                 mid.add(fabric.getJointLocation(joint)), new Vector3()).multiplyScalar(1.0 / 3.0)
        //         }
        //         faces.sort((a: IFace, b: IFace) => {
        //             const toA = cameraPosition.distanceToSquared(midpoint(a))
        //             const toB = cameraPosition.distanceToSquared(midpoint(b))
        //             return toA < toB ? 1 : toA > toB ? -1 : 0
        //         })
        //         return faces.pop()
        //     })
        //     if (closestFace) {
        //         this.click(closestFace)
        //     }
        // }
        return (
            <Canvas>
                <perspectiveCamera/>
                <mesh
                    key="Triangles"
                    geometry={fabric.facesGeometry}
                    material={TENSEGRITY_FACE}
                    onPointerDown={
                        (event: React.MouseEvent<HTMLDivElement>) => {
                            console.log("event", event)
                        }
                    }
                />
                <lineSegments
                    key="Lines"
                    geometry={fabric.linesGeometry}
                    material={TENSEGRITY_LINE}/>
                <SurfaceComponent/>
            </Canvas>
        )
    }

// =================================================================================================================

    // private click(face: IFace): void {
    //     console.log("Face", face)
    //     let fabric = this.props.tensegrityState.fabric
    //     const brick = fabric.growBrick(face.brick, face.triangle)
    //     fabric.connectBricks(face.brick, face.triangle, brick, brick.base)
    //     this.props.tensegrityState.fabric.iterate(1)
    //     fabric.centralize()
    // }

    private beginAnimating(): void {
        const step = () => {
            setTimeout(
                () => {
                    const iterating = this.state.iterating
                    this.props.tensegrityState.fabric.iterate(1)
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

