/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, CanvasContext, extend, ReactThreeFiber, useRender, useThree } from "react-three-fiber"
import { Mesh, SphereGeometry } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricExports } from "../fabric/fabric-exports"
import { createFabricKernel } from "../fabric/fabric-kernel"
import { Physics } from "../fabric/physics"
import { Selectable, SpanAdjustment, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { MAX_POPULATION } from "../gotchi/evolution"

import { Flight } from "./flight"
import { TensegrityFlightState } from "./flight-state"
import {
    TENSEGRITY_FACE,
    TENSEGRITY_JOINT,
    TENSEGRITY_JOINT_ADJUSTING_BAR,
    TENSEGRITY_JOINT_ADJUSTING_CABLE,
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
                     case "b":
                         fabric.selectable = Selectable.BAR
                         break
                     case "c":
                         fabric.selectable = Selectable.CABLE
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
                fabricInstanceExports={fabric.exports}
            />
        </div>
    )
}

function FabricView({fabric}: { fabric: TensegrityFabric }): JSX.Element {
    const root = document.getElementById("tensegrity-view") as HTMLElement
    const sphereGeometry = new SphereGeometry(0.2, 16, 16)
    // const rayCaster = new Raycaster()
    const [holdFaceEvent, setHoldFaceEvent] = useState<React.MouseEvent<HTMLDivElement> | undefined>()
    const [dragJointEvent, setDragJointEvent] = useState<React.MouseEvent<HTMLDivElement> | undefined>()
    const [age, setAge] = useState<number>(0)
    const {camera} = useThree()
    const controls = useRef<OrbitControls>()
    const triangleMesh = useRef<Mesh>()
    // const {size} = useThree()
    const flightState = TensegrityFlightState(fabric)
    let flight: Flight | undefined
    const render = (context: CanvasContext) => {
        if (flight) {
            flight.update()
            flight.moveTowardsTarget(flightState.target)
            flight.autoRotate = !fabric.selectedFace && !fabric.selectedJoint
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
    const selectedJointMaterial = () => {
        switch (fabric.spanAdjustment) {
            case SpanAdjustment.BAR_LONGER:
            case SpanAdjustment.BAR_SHORTER:
                return TENSEGRITY_JOINT_ADJUSTING_BAR
            case SpanAdjustment.CABLES_LONGER:
            case SpanAdjustment.CABLES_SHORTER:
                return TENSEGRITY_JOINT_ADJUSTING_CABLE
            default:
                return TENSEGRITY_JOINT_SELECTED
        }
    }
    const selectedFace = fabric.selectedFace
    const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()
    const clickOnFace = (faceIndex: number) => {
        if (!fabric.selectedFace || faceIndex !== fabric.selectedFace.index) {
            fabric.selectedFace = fabric.findFace(faceIndex)
        } else if (fabric.selectedFace.canGrow) {
            const brick = fabric.growBrick(fabric.selectedFace.brick, fabric.selectedFace.triangle)
            fabric.connectBricks(fabric.selectedFace.brick, fabric.selectedFace.triangle, brick, brick.base)
            fabric.selectedJoint = undefined
            fabric.selectedFace = undefined
        }
        fabric.selectable = Selectable.NONE
    }
    return (
        <group>
            <orbitControls
                ref={controls}
                args={[camera, root]}
            />
            <scene
                onPointerUp={sceneRelease}
                onPointerOut={sceneRelease}
                onPointerMove={scenePointerMove}
            >
                {fabric.isGestating ? undefined : (
                    <mesh
                        key="Triangles"
                        ref={triangleMesh}
                        geometry={fabric.facesGeometry}
                        material={TENSEGRITY_FACE}
                    />
                )}
                {fabric.selectable !== Selectable.FACE ? undefined : (
                    fabric.getFaceMidpoints().map((location, faceIndex) => (
                        <mesh
                            key={`F${faceIndex}`}
                            geometry={sphereGeometry}
                            position={location}
                            material={TENSEGRITY_JOINT}
                            onClick={() => clickOnFace(faceIndex)}
                            onPointerDown={stopPropagation}
                            onPointerUp={stopPropagation}
                        />
                    )))}
                )}
                {fabric.selectable !== Selectable.JOINT ? undefined : (
                    fabric.getJointLocations().map((location, joint) => (
                        <mesh
                            key={`J${joint}`}
                            geometry={sphereGeometry}
                            position={location}
                            material={TENSEGRITY_JOINT}
                            onClick={() => {
                                fabric.selectedJoint = joint
                                fabric.selectedFace = undefined
                            }}
                            onPointerDown={stopPropagation}
                            onPointerUp={stopPropagation}
                        />
                    )))}
                )}
                {!selectedFace ? (
                    fabric.selectedJoint === undefined ? undefined : (
                        <mesh
                            key={`J${fabric.selectedJoint}`}
                            geometry={sphereGeometry}
                            position={fabric.getJointLocation(fabric.selectedJoint)}
                            material={selectedJointMaterial()}
                            onPointerDown={selectedJointDown}
                            onClick={selectedJointClick}
                        />
                    )
                ) : (
                    <mesh
                        key={`F${selectedFace.index}`}
                        geometry={sphereGeometry}
                        position={fabric.getFaceMidpoint(selectedFace.index)}
                        material={selectedFace.canGrow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
                        onClick={() => {
                            if (selectedFace.canGrow) {
                                const brick = fabric.growBrick(selectedFace.brick, selectedFace.triangle)
                                fabric.connectBricks(selectedFace.brick, selectedFace.triangle, brick, brick.base)
                                fabric.selectedFace = undefined
                            }
                        }}
                        onPointerDown={stopPropagation}
                        onPointerUp={stopPropagation}
                    />
                )}
                <lineSegments
                    key="Lines"
                    geometry={fabric.linesGeometry}
                    material={TENSEGRITY_LINE}/>
                <SurfaceComponent/>
            </scene>
            )}
        </group>
    )
}
