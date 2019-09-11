/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, extend, ReactThreeFiber, useRender, useThree } from "react-three-fiber"
import { Geometry, SphereGeometry } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricExports } from "../fabric/fabric-exports"
import { FabricKernel } from "../fabric/fabric-kernel"
import { Physics } from "../fabric/physics"
import { IFace, IInterval, IJoint, Triangle } from "../fabric/tensegrity-brick"
import { Selectable, TensegrityFabric } from "../fabric/tensegrity-fabric"

import { Flight } from "./flight"
import { TensegrityFlightState } from "./flight-state"
import {
    TENSEGRITY_FACE,
    TENSEGRITY_JOINT,
    TENSEGRITY_JOINT_CAN_GROW,
    TENSEGRITY_JOINT_SELECTED,
    TENSEGRITY_LINE,
} from "./materials"
import { PhysicsPanel } from "./physics-panel"
import { SurfaceComponent } from "./surface-component"

extend({OrbitControls})

declare global {
    namespace JSX {
        // tslint:disable-next-line:interface-name
        interface IntrinsicElements {
            orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>
        }
    }
}

const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()

const ITERATIONS_PER_FRAME = 10

export function TensegrityView({fabricExports, fabricKernel, physics}:
                                   {
                                       fabricExports: IFabricExports,
                                       fabricKernel: FabricKernel,
                                       physics: Physics,
                                   }): JSX.Element {
    const createTower = (size: number, name: string): TensegrityFabric => {
        const freshFabric = fabricKernel.createTensegrityFabric(name)
        if (!freshFabric) {
            throw new Error()
        }
        if (freshFabric) {
            physics.acquireLocal(freshFabric.exports)
            let brick = freshFabric.createBrick()
            while (--size > 0) {
                const face = brick.faces[Triangle.PPP]
                const nextBrick = freshFabric.growBrick(face.brick, face.triangle)
                freshFabric.connectBricks(face.brick, face.triangle, nextBrick, nextBrick.base)
            }
        }
        return freshFabric
    }
    const [fabric, setFabric] = useState<TensegrityFabric>(createTower(1, "init"))
    // tslint:disable-next-line:no-null-keyword
    const viewRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => viewRef.current ? viewRef.current.focus() : undefined)
    const factor = (up: boolean) => 1.0 + (up ? 0.005 : -0.005)
    const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const handleJoint = (joint: IJoint | undefined, bar: boolean, up: boolean) => {
            if (joint === undefined) {
                return
            }
            fabric.exports.multiplyJointIdealSpan(joint.index, bar, factor(up))
        }
        const handleInterval = (interval: IInterval | undefined, up: boolean) => {
            if (interval === undefined) {
                return
            }
            fabric.exports.setSpanDivergence(interval.index, factor(up))
        }
        const handleFace = (face: IFace | undefined, bar: boolean, up: boolean) => {
            if (face === undefined) {
                return
            }
            fabric.exports.setFaceSpanDivergence(face.index, bar, factor(up))
        }
        switch (event.key) {
            case "1":
                setFabric(createTower(1, "yes"))
                break
            case " ":
                if (fabric.selectionActive) {
                    fabric.selectable = Selectable.NONE
                    fabric.cancelSelection()
                } else {
                    fabric.autoRotate = !fabric.autoRotate
                }
                break
            case "ArrowUp":
                handleJoint(fabric.selectedJoint, true, true)
                handleFace(fabric.selectedFace, true, true)
                handleInterval(fabric.selectedInterval, true)
                break
            case "ArrowDown":
                handleJoint(fabric.selectedJoint, true, false)
                handleFace(fabric.selectedFace, true, false)
                handleInterval(fabric.selectedInterval, false)
                break
            case "ArrowLeft":
                handleJoint(fabric.selectedJoint, false, false)
                handleFace(fabric.selectedFace, false, false)
                handleInterval(fabric.selectedInterval, false)
                break
            case "ArrowRight":
                handleJoint(fabric.selectedJoint, false, true)
                handleFace(fabric.selectedFace, false, true)
                handleInterval(fabric.selectedInterval, true)
                break
            case "Alt":
                fabric.selectable = Selectable.INTERVAL
                break
            case "Meta":
                fabric.selectable = event.shiftKey ? Selectable.GROW_FACE : Selectable.JOINT
                break
            case "Shift":
                fabric.selectable = event.metaKey ? Selectable.GROW_FACE : Selectable.FACE
                break
            case "j":
                fabric.exports.setAltitude(5)
                break
            case "c":
                fabric.exports.centralize()
                break
            case "l":
                fabric.optimize(false)
                break
            case "h":
                fabric.optimize(true)
                break
            default:
                console.log("Key", event.key)
        }
    }
    const onKeyUpCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
        fabric.selectable = Selectable.NONE
    }
    return (
        <div ref={viewRef} tabIndex={1} id="tensegrity-view" className="the-whole-page"
             onKeyDownCapture={onKeyDownCapture} onKeyUpCapture={onKeyUpCapture}
        >
            <Canvas>
                <FabricView fabric={fabric}/>
            </Canvas>
            <PhysicsPanel physics={physics} fabricExports={fabricExports} instanceExports={fabric.exports}/>
        </div>
    )
}

function FabricView({fabric}: { fabric: TensegrityFabric }): JSX.Element {
    const root = document.getElementById("tensegrity-view") as HTMLElement
    const sphere = new SphereGeometry(0.12, 16, 16)
    const [age, setAge] = useState<number>(0)
    const {camera} = useThree()
    const controls = useRef<OrbitControls>()
    const flightState = TensegrityFlightState(fabric)
    let flight: Flight | undefined
    const render = () => {
        if (flight) {
            flight.update()
            flight.moveTowardsTarget(flightState.target)
            flight.autoRotate = fabric.autoRotate
        } else if (controls.current) {
            flight = new Flight(flightState, controls.current)
        }
        fabric.iterate(ITERATIONS_PER_FRAME)
        if (fabric.exports.isGestating()) {
            console.log("gestating")
        }
        setAge(fabric.exports.getAge())
    }
    useRender(render)
    if (age < 0) {
        throw new Error()
    }
    const selectedJoint = fabric.selectedJoint
    const selectedFace = fabric.selectedFace
    const selectedInterval = fabric.selectedInterval
    return (
        <group>
            <orbitControls ref={controls} args={[camera, root]}/>
            <scene>
                <mesh key="faces" geometry={fabric.facesGeometry} material={TENSEGRITY_FACE}/>
                <lineSegments key="lines" geometry={fabric.linesGeometry} material={TENSEGRITY_LINE}/>
                <SurfaceComponent/>
                {fabric.selectable !== Selectable.FACE ? undefined : (
                    <FaceSelection fabric={fabric} geometry={sphere} grow={false}/>
                )}
                {fabric.selectable !== Selectable.GROW_FACE ? undefined : (
                    <FaceSelection fabric={fabric} geometry={sphere} grow={true}/>
                )}
                {fabric.selectable !== Selectable.JOINT ? undefined : (
                    <JointSelection fabric={fabric} geometry={sphere}/>)}
                )}
                {fabric.selectable !== Selectable.INTERVAL ? undefined : (
                    <IntervalSelection fabric={fabric} geometry={sphere}/>)}
                )}
                {selectedJoint === undefined ? undefined : (
                    <SelectedJoint fabric={fabric} geometry={sphere} selectedJoint={selectedJoint}/>
                )}
                {selectedFace === undefined ? undefined : (
                    <SelectedFace fabric={fabric} geometry={sphere} selectedFace={selectedFace}/>
                )}
                {selectedInterval === undefined ? undefined : (
                    <SelectedInterval fabric={fabric} geometry={sphere} selectedInterval={selectedInterval}/>
                )}
            </scene>
        </group>
    )
}

function FaceSelection({fabric, geometry, grow}:
                           {
                               fabric: TensegrityFabric,
                               geometry: Geometry,
                               grow: boolean,
                           }): JSX.Element {
    const faces = grow ? fabric.faces.filter(face => face.canGrow) : fabric.faces
    return (
        <>
            {faces.map((face: IFace) => (
                <mesh
                    key={`F${face.index}`}
                    geometry={geometry}
                    position={fabric.exports.getFaceMidpoint(face.index)}
                    material={grow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
                    onClick={() => {
                        if (grow) {
                            const brick = fabric.growBrick(face.brick, face.triangle)
                            fabric.connectBricks(face.brick, face.triangle, brick, brick.base)
                            fabric.cancelSelection()
                        } else {
                            fabric.selectedFace = face
                        }
                    }}
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                />
            ))}
        </>
    )
}

function SelectedFace({fabric, geometry, selectedFace}:
                          {
                              fabric: TensegrityFabric,
                              geometry: Geometry,
                              selectedFace: IFace,
                          }): JSX.Element {
    return (
        <mesh
            key={`F${selectedFace.index}`}
            geometry={geometry}
            position={fabric.exports.getFaceMidpoint(selectedFace.index)}
            material={TENSEGRITY_JOINT}
            onPointerDown={stopPropagation}
            onPointerUp={stopPropagation}
        />
    )
}

function JointSelection({fabric, geometry}:
                            {
                                fabric: TensegrityFabric,
                                geometry: Geometry,
                            }): JSX.Element {
    return (
        <>
            {[...Array(fabric.jointCount)].map((x, jointIndex) => (
                <mesh
                    key={`J${jointIndex}`}
                    geometry={geometry}
                    position={fabric.exports.getJointLocation(jointIndex)}
                    material={TENSEGRITY_JOINT}
                    onClick={() => fabric.selectedJoint = fabric.joints[jointIndex]}
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                />
            ))}
        </>
    )
}

function SelectedJoint({fabric, geometry, selectedJoint}:
                           {
                               fabric: TensegrityFabric,
                               geometry: Geometry,
                               selectedJoint: IJoint,
                           }): JSX.Element {
    return (
        <mesh
            key={`J${selectedJoint.index}`}
            geometry={geometry}
            position={fabric.exports.getJointLocation(selectedJoint.index)}
            material={TENSEGRITY_JOINT_SELECTED}
        />
    )
}

function IntervalSelection({fabric, geometry}:
                               {
                                   fabric: TensegrityFabric,
                                   geometry: Geometry,
                               }): JSX.Element {
    return (
        <>
            {fabric.intervals.filter(interval => !interval.removed).map((interval: IInterval) => (
                <mesh
                    key={`I${interval.index}`}
                    geometry={geometry}
                    position={fabric.exports.getIntervalMidpoint(interval.index)}
                    material={TENSEGRITY_JOINT}
                    onClick={() => fabric.selectedInterval = interval}
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                />
            ))}
        </>
    )
}

function SelectedInterval({fabric, geometry, selectedInterval}:
                              {
                                  fabric: TensegrityFabric,
                                  geometry: Geometry,
                                  selectedInterval: IInterval,
                              }): JSX.Element {
    return (
        <mesh
            key={`I${selectedInterval.index}`}
            geometry={geometry}
            position={fabric.exports.getIntervalMidpoint(selectedInterval.index)}
            material={TENSEGRITY_JOINT_SELECTED}
        />
    )
}

