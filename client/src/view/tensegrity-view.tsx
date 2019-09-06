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
import { IFace, IInterval, Joint } from "../fabric/tensegrity-brick"
import { Selectable, SpanAdjustment, TensegrityFabric } from "../fabric/tensegrity-fabric"
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
    return (
        <div ref={viewRef} tabIndex={1} id="tensegrity-view" className="the-whole-page"
             onKeyDownCapture={(event: React.KeyboardEvent<HTMLDivElement>) => {
                 fabric.selectedJoint = undefined
                 fabric.selectedFace = undefined
                 fabric.selectedInterval = undefined
                 console.log("Key", event.key)
                 switch (event.key) {
                     case " ":
                         fabric.selectable = Selectable.NONE
                         break
                     case "j":
                         fabric.selectable = Selectable.JOINT
                         break
                     case "f":
                         fabric.selectable = Selectable.FACE
                         break
                     case "i":
                         fabric.selectable = Selectable.INTERVAL
                         break
                 }
             }}
        >
            <Canvas>
                <FabricView fabric={fabric}/>
            </Canvas>
            <PhysicsPanel
                physics={physics}
                fabricExports={fabricExports}
                instanceExports={fabric.exports}
            />
        </div>
    )
}

function FabricView({fabric}: { fabric: TensegrityFabric }): JSX.Element {
    const root = document.getElementById("tensegrity-view") as HTMLElement
    const sphereGeometry = new SphereGeometry(0.12, 16, 16)
    const [holdFaceEvent, setHoldFaceEvent] = useState<React.MouseEvent<HTMLDivElement> | undefined>()
    const [dragJointEvent, setDragJointEvent] = useState<React.MouseEvent<HTMLDivElement> | undefined>()
    const [age, setAge] = useState<number>(0)
    const {camera} = useThree()
    const controls = useRef<OrbitControls>()
    const flightState = TensegrityFlightState(fabric)
    let flight: Flight | undefined
    const render = () => {
        if (flight) {
            flight.update()
            flight.moveTowardsTarget(flightState.target)
            flight.autoRotate = !fabric.selectedFace && !fabric.selectedJoint && !fabric.selectedInterval
        } else if (controls.current) {
            flight = new Flight(controls.current)
            flight.setupCamera(flightState)
            flight.enabled = true
        }
        fabric.iterate(30)
        const changeSpan = (movement: number, bar: boolean): void => {
            if (fabric.selectedJoint === undefined) {
                return
            }
            const factor = 1.0 + 0.002 * movement
            fabric.multiplyAdjacentIdealSpan(fabric.selectedJoint, bar, factor)
        }
        switch (fabric.spanAdjustment) {
            case SpanAdjustment.NONE:
                break
            case SpanAdjustment.BAR_LONGER:
                changeSpan(1, true)
                break
            case SpanAdjustment.BAR_SHORTER:
                changeSpan(-1, true)
                break
            case SpanAdjustment.CABLES_LONGER:
                changeSpan(1, false)
                break
            case SpanAdjustment.CABLES_SHORTER:
                changeSpan(-1, false)
                break
        }
        setAge(fabric.age)
    }
    useRender(render)
    if (age < 0) {
        throw new Error()
    }
    const sceneRelease = () => {
        const currentControls = controls.current
        if (currentControls) {
            currentControls.enabled = true
        }
        setDragJointEvent(undefined)
        fabric.spanAdjustment = SpanAdjustment.NONE
    }
    const scenePointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (holdFaceEvent) {
            setHoldFaceEvent(undefined)
        }
        let adjustment = SpanAdjustment.NONE
        if (fabric.selectedJoint !== undefined && dragJointEvent !== undefined) {
            const x = event.clientX - dragJointEvent.clientX
            const y = event.clientY - dragJointEvent.clientY
            const xx = x * x
            const yy = y * y
            if (xx >= 125 || yy >= 125) {
                if (xx > yy) {
                    adjustment = x > 0 ? SpanAdjustment.BAR_LONGER : SpanAdjustment.BAR_SHORTER
                } else {
                    adjustment = y > 0 ? SpanAdjustment.CABLES_SHORTER : SpanAdjustment.CABLES_LONGER
                }
            }
        }
        fabric.spanAdjustment = adjustment
    }
    const selectedJointDown = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation()
        const currentControls = controls.current
        if (currentControls) {
            currentControls.enabled = false
        }
        setDragJointEvent(event)
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
            <scene onPointerUp={sceneRelease} onPointerOut={sceneRelease} onPointerMove={scenePointerMove}>
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
                                   onPointerDown={selectedJointDown}
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
                    position={fabric.getFaceMidpoint(face.index)}
                    material={TENSEGRITY_JOINT}
                    onClick={() => {
                        if (!fabric.selectedFace || face.index !== fabric.selectedFace.index) {
                            fabric.selectedFace = face
                        } else if (fabric.selectedFace.canGrow) {
                            const brick = fabric.growBrick(fabric.selectedFace.brick, fabric.selectedFace.triangle)
                            fabric.connectBricks(fabric.selectedFace.brick, fabric.selectedFace.triangle, brick, brick.base)
                            fabric.selectedJoint = undefined
                            fabric.selectedFace = undefined
                        }
                        fabric.selectable = Selectable.NONE

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
            position={fabric.getFaceMidpoint(selectedFace.index)}
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
                    position={fabric.getJointLocation(jointIndex)}
                    material={TENSEGRITY_JOINT}
                    onClick={() => {
                        fabric.selectedJoint = jointIndex
                        fabric.selectable = Selectable.NONE
                    }}
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                />
            ))}
        </>
    )
}

function SelectedJoint({fabric, geometry, selectedJoint, onPointerDown, onClick}:
                           {
                               fabric: TensegrityFabric,
                               geometry: Geometry,
                               selectedJoint: Joint,
                               onPointerDown: (event: React.MouseEvent<HTMLDivElement>) => void,
                               onClick: (event: React.MouseEvent<HTMLDivElement>) => void,
                           }): JSX.Element {
    return (
        <mesh
            key={`J${selectedJoint}`}
            geometry={geometry}
            position={fabric.getJointLocation(selectedJoint)}
            material={TENSEGRITY_JOINT_SELECTED}
            onPointerDown={onPointerDown}
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
            {fabric.intervals.map((interval: IInterval) => (
                <mesh
                    key={`J${interval.index}`}
                    geometry={geometry}
                    position={fabric.getLineMidpoint(interval.index)}
                    material={TENSEGRITY_JOINT}
                    onClick={() => {
                        fabric.selectedInterval = interval
                        fabric.selectable = Selectable.NONE
                    }}
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
            key={`J${selectedInterval.index}`}
            geometry={geometry}
            position={fabric.getLineMidpoint(selectedInterval.index)}
            material={TENSEGRITY_JOINT_SELECTED}
            onClick={onClick}
        />
    )
}

