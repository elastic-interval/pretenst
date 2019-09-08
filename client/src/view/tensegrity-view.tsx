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
import { createFabricKernel } from "../fabric/fabric-kernel"
import { Physics } from "../fabric/physics"
import { IFace, IInterval, IJoint } from "../fabric/tensegrity-brick"
import { Selectable, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { MAX_POPULATION } from "../gotchi/evolution"

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

export function TensegrityView({fabricExports}: { fabricExports: IFabricExports }): JSX.Element {
    const physics = new Physics()
    physics.applyGlobal(fabricExports)
    const fabricKernel = createFabricKernel(fabricExports, MAX_POPULATION, 500)
    const fabric = fabricKernel.createTensegrityFabric()
    if (!fabric) {
        throw new Error()
    }
    if (fabric) {
        fabric.applyPhysics(physics)
        fabric.createBrick()
    }
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
            fabric.exports.multiplyIntervalIdealSpan(interval.index, factor(up))
        }
        const handleFace = (face: IFace | undefined, up: boolean) => {
            if (face === undefined) {
                return
            }
            fabric.exports.multiplyFaceIdealSpan(face.index, factor(up))
        }
        switch (event.key) {
            case " ":
                fabric.selectable = Selectable.NONE
                fabric.cancelSelection()
                break
            case "ArrowUp":
                handleJoint(fabric.selectedJoint, true, true)
                handleFace(fabric.selectedFace, true)
                handleInterval(fabric.selectedInterval, true)
                break
            case "ArrowDown":
                handleJoint(fabric.selectedJoint, true, false)
                handleFace(fabric.selectedFace, false)
                handleInterval(fabric.selectedInterval, false)
                break
            case "ArrowLeft":
                handleJoint(fabric.selectedJoint, false, false)
                handleFace(fabric.selectedFace, false)
                handleInterval(fabric.selectedInterval, false)
                break
            case "ArrowRight":
                handleJoint(fabric.selectedJoint, false, true)
                handleFace(fabric.selectedFace, true)
                handleInterval(fabric.selectedInterval, true)
                break
            case "Control":
                fabric.selectable = Selectable.JOINT
                break
            case "Alt":
                fabric.selectable = Selectable.INTERVAL
                break
            case "Meta":
                fabric.selectable = Selectable.FACE
                break
            case "h":
                fabric.exports.setAltitude(5)
                break
            case "c":
                fabric.exports.centralize()
                break
            case "o":
                fabric.optimize()
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
    const sphereGeometry = new SphereGeometry(0.12, 16, 16)
    const [age, setAge] = useState<number>(0)
    const {camera} = useThree()
    const controls = useRef<OrbitControls>()
    const flightState = TensegrityFlightState(fabric)
    let flight: Flight | undefined
    const render = () => {
        if (flight) {
            flight.update()
            flight.moveTowardsTarget(flightState.target)
            flight.autoRotate = !fabric.selectionActive
        } else if (controls.current) {
            flight = new Flight(controls.current)
            flight.setupCamera(flightState)
            flight.enabled = true
        }
        fabric.iterate(30)
        setAge(fabric.exports.getAge())
    }
    useRender(render)
    if (age < 0) {
        throw new Error()
    }
    const selectedJointClick = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation()
        fabric.selectedJoint = undefined
    }
    const selectedFaceClick = (face: IFace) => {
        if (!face.canGrow) {
            return
        }
        const brick = fabric.growBrick(face.brick, face.triangle)
        fabric.connectBricks(face.brick, face.triangle, brick, brick.base)
        fabric.selectedFace = undefined
    }
    const selectedIntervalClick = (interval: IInterval) => {
        console.log("Click interval", interval.index)
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
                    <FaceSelection fabric={fabric} geometry={sphereGeometry}/>
                )}
                {fabric.selectable !== Selectable.JOINT ? undefined : (
                    <JointSelection fabric={fabric} geometry={sphereGeometry}/>)}
                )}
                {fabric.selectable !== Selectable.INTERVAL ? undefined : (
                    <IntervalSelection fabric={fabric} geometry={sphereGeometry}/>)}
                )}
                {selectedJoint === undefined ? undefined : (
                    <SelectedJoint fabric={fabric} geometry={sphereGeometry}
                                   selectedJoint={selectedJoint}
                                   onClick={selectedJointClick}
                    />
                )}
                {selectedFace === undefined ? undefined : (
                    <SelectedFace fabric={fabric} geometry={sphereGeometry}
                                  selectedFace={selectedFace}
                                  onClick={() => selectedFaceClick(selectedFace)}
                    />
                )}
                {selectedInterval === undefined ? undefined : (
                    <SelectedInterval fabric={fabric} geometry={sphereGeometry}
                                      selectedInterval={selectedInterval}
                                      onClick={() => selectedIntervalClick(selectedInterval)}
                    />
                )}
            </scene>
        </group>
    )
}

function FaceSelection({fabric, geometry}:
                           {
                               fabric: TensegrityFabric,
                               geometry: Geometry,
                           }): JSX.Element {
    return (
        <>
            {fabric.faces.map((face: IFace) => (
                <mesh
                    key={`F${face.index}`}
                    geometry={geometry}
                    position={fabric.exports.getFaceMidpoint(face.index)}
                    material={face.canGrow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
                    onClick={() => {
                        if (!fabric.selectedFace || face.index !== fabric.selectedFace.index) {
                            fabric.selectedFace = face
                        } else if (fabric.selectedFace.canGrow) {
                            const brick = fabric.growBrick(fabric.selectedFace.brick, fabric.selectedFace.triangle)
                            fabric.connectBricks(fabric.selectedFace.brick, fabric.selectedFace.triangle, brick, brick.base)
                            fabric.cancelSelection()
                        }
                    }}
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                />
            ))}
        </>
    )
}

function SelectedFace({fabric, geometry, selectedFace, onClick}:
                          {
                              fabric: TensegrityFabric,
                              geometry: Geometry,
                              selectedFace: IFace,
                              onClick: (event: React.MouseEvent<HTMLDivElement>) => void,
                          }): JSX.Element {
    return (
        <mesh
            key={`F${selectedFace.index}`}
            geometry={geometry}
            position={fabric.exports.getFaceMidpoint(selectedFace.index)}
            material={selectedFace.canGrow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
            onClick={onClick}
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

function SelectedJoint({fabric, geometry, selectedJoint, onClick}:
                           {
                               fabric: TensegrityFabric,
                               geometry: Geometry,
                               selectedJoint: IJoint,
                               onClick: (event: React.MouseEvent<HTMLDivElement>) => void,
                           }): JSX.Element {
    return (
        <mesh
            key={`J${selectedJoint.index}`}
            geometry={geometry}
            position={fabric.exports.getJointLocation(selectedJoint.index)}
            material={TENSEGRITY_JOINT_SELECTED}
            onClick={onClick}
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

function SelectedInterval({fabric, geometry, selectedInterval, onClick}:
                              {
                                  fabric: TensegrityFabric,
                                  geometry: Geometry,
                                  selectedInterval: IInterval,
                                  onClick: (event: React.MouseEvent<HTMLDivElement>) => void,
                              }): JSX.Element {
    return (
        <mesh
            key={`I${selectedInterval.index}`}
            geometry={geometry}
            position={fabric.exports.getIntervalMidpoint(selectedInterval.index)}
            material={TENSEGRITY_JOINT_SELECTED}
            onClick={onClick}
        />
    )
}

