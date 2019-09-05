/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRef, useState } from "react"
import { Canvas, CanvasContext, extend, ReactThreeFiber, useRender, useThree } from "react-three-fiber"
import { Mesh, Raycaster, SphereGeometry, Vector2, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricExports } from "../fabric/fabric-exports"
import { createFabricKernel } from "../fabric/fabric-kernel"
import { Physics } from "../fabric/physics"
import { IFace, Joint } from "../fabric/tensegrity-brick"
import { SpanAdjustment, TensegrityFabric } from "../fabric/tensegrity-fabric"
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
    return (
        <div className="the-whole-page">
            <Canvas invalidateFrameloop>
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
    const root = document.getElementById("root") as HTMLElement
    const sphereGeometry = new SphereGeometry(0.2, 16, 16)
    const rayCaster = new Raycaster()
    const [holdFaceEvent, setHoldFaceEvent] = useState<React.MouseEvent<HTMLDivElement> | undefined>()
    const [selectedFace, setSelectedFace] = useState<IFace | undefined>()
    const [dragJointEvent, setDragJointEvent] = useState<React.MouseEvent<HTMLDivElement> | undefined>()
    const [age, setAge] = useState<number>(0)
    const {camera} = useThree()
    const controls = useRef<OrbitControls>()
    const triangleMesh = useRef<Mesh>()
    const {size} = useThree()
    const flightState = TensegrityFlightState(fabric)
    let flight: Flight | undefined
    const render = (context: CanvasContext) => {
        if (flight) {
            flight.update()
            flight.moveTowardsTarget(flightState.target)
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
    const findFace = (event: React.MouseEvent<HTMLDivElement>) => {
        const mouse = new Vector2((event.clientX / size.width) * 2 - 1, -(event.clientY / size.height) * 2 + 1)
        if (!triangleMesh.current) {
            return
        }
        rayCaster.setFromCamera(mouse, camera)
        const intersections = rayCaster.intersectObjects([triangleMesh.current], true)
            .filter(i => i.faceIndex !== undefined)
        const faces = intersections.map(intersection => {
            const triangleIndex = intersection.faceIndex ? intersection.faceIndex : 0
            return fabric.findFace(triangleIndex)
        })
        const cameraPosition = camera.position
        const midpoint = (face: IFace): Vector3 => {
            return face.joints.reduce((mid: Vector3, joint: Joint) =>
                mid.add(fabric.getJointLocation(joint)), new Vector3()).multiplyScalar(1.0 / 3.0)
        }
        faces.sort((a: IFace, b: IFace) => {
            const toA = cameraPosition.distanceToSquared(midpoint(a))
            const toB = cameraPosition.distanceToSquared(midpoint(b))
            return toA < toB ? 1 : toA > toB ? -1 : 0
        })
        return faces.pop()
    }
    const facePointerUp = () => {
        const face = holdFaceEvent ? findFace(holdFaceEvent) : undefined
        if (face) {
            if (!selectedFace || face.index !== selectedFace.index) {
                setSelectedFace(face)
            } else if (selectedFace.canGrow) {
                const brick = fabric.growBrick(selectedFace.brick, selectedFace.triangle)
                fabric.connectBricks(selectedFace.brick, selectedFace.triangle, brick, brick.base)
                fabric.selectedJoint = undefined
                setSelectedFace(undefined)
            }
        }
    }
    const facePointerDown = (event: React.MouseEvent<HTMLDivElement>) => {
        fabric.selectedJoint = undefined
        setHoldFaceEvent(event)
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
    return (
        <group>
            <orbitControls
                ref={controls}
                args={[camera, root]}
                panSpeed={2.0}
                rotateSpeed={0.5}
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
                        onPointerDown={facePointerDown}
                        onPointerUp={facePointerUp}
                    />
                )}
                {!selectedFace ? (
                    fabric.selectedJoint === undefined ? undefined : (
                        <mesh
                            key={`J${fabric.selectedJoint}`}
                            geometry={sphereGeometry}
                            position={fabric.getJointLocation(fabric.selectedJoint)}
                            material={TENSEGRITY_JOINT_SELECTED}
                            onPointerDown={selectedJointDown}
                            onClick={selectedJointClick}
                        />
                    )
                ) : (
                    selectedFace.joints.map(joint => (
                        <mesh
                            key={`J${joint}`}
                            geometry={sphereGeometry}
                            position={fabric.getJointLocation(joint)}
                            material={selectedFace.canGrow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
                            onClick={() => {
                                fabric.selectedJoint = joint
                                setSelectedFace(undefined)
                            }}
                            onPointerDown={event => event.stopPropagation()}
                            onPointerUp={event => event.stopPropagation()}
                        />
                    )))}
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
