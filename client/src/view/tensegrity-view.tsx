/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, CanvasContext, extend, ReactThreeFiber, useRender, useThree } from "react-three-fiber"
import { Mesh, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricExports } from "../fabric/fabric-exports"
import { createFabricKernel } from "../fabric/fabric-kernel"
import { Physics } from "../fabric/physics"
import { IFace, Joint } from "../fabric/tensegrity-brick"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { MAX_POPULATION } from "../gotchi/evolution"

import { Flight } from "./flight"
import { TensegrityFlightState } from "./flight-state"
import { TENSEGRITY_FACE, TENSEGRITY_LINE } from "./materials"
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

export function TensegrityView({fabricExports}: {fabricExports: IFabricExports}): JSX.Element {
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

function FabricView({fabric}:{fabric: TensegrityFabric}): JSX.Element {
    const rayCaster = new Raycaster()
    const [time, setTime] = useState<number>(0)
    const scene = useRef<Scene>()
    const camera = useRef<PerspectiveCamera>()
    const controls = useRef<OrbitControls>()
    const triangleMesh = useRef<Mesh>()
    const {size, setDefaultCamera} = useThree()
    let flight: Flight | undefined
    useEffect(() => {
        if (camera.current) {
            setDefaultCamera(camera.current)
        }
    }, [])
    useRender(({gl, canvas}: CanvasContext, timestamp: number) => {
        if (flight) {
            flight.update()
        } else if (controls.current && camera.current) {
            flight = new Flight(controls.current)
            flight.setupCamera(TensegrityFlightState())
            flight.enabled = true
        }
        fabric.iterate(1)
        setTime(timestamp)
    })
    if (!time) {
        console.log("time", time)
    }
    const root = document.getElementById("root") as HTMLElement
    const onMouseDownCapture = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!event.shiftKey) {
            return
        }
        const mouse = new Vector2((event.clientX / size.width) * 2 - 1, -(event.clientY / size.height) * 2 + 1)
        if (camera.current && triangleMesh.current) {
            rayCaster.setFromCamera(mouse, camera.current)
            const intersections = rayCaster.intersectObjects([triangleMesh.current], true)
                .filter(i => i.faceIndex !== undefined)
            const faces = intersections.map(intersection => {
                const triangleIndex = intersection.faceIndex ? intersection.faceIndex : 0
                return fabric.findFace(triangleIndex)
            })
            const cameraPosition = camera.current.position
            const midpoint = (face: IFace): Vector3 => {
                return face.joints.reduce((mid: Vector3, joint: Joint) =>
                    mid.add(fabric.getJointLocation(joint)), new Vector3()).multiplyScalar(1.0 / 3.0)
            }
            faces.sort((a: IFace, b: IFace) => {
                const toA = cameraPosition.distanceToSquared(midpoint(a))
                const toB = cameraPosition.distanceToSquared(midpoint(b))
                return toA < toB ? 1 : toA > toB ? -1 : 0
            })
            const closestFace = faces.pop()
            if (closestFace) {
                const brick = fabric.growBrick(closestFace.brick, closestFace.triangle)
                fabric.connectBricks(closestFace.brick, closestFace.triangle, brick, brick.base)
                fabric.iterate(1)
                fabric.centralize()
            }
        }
    }
    return (
        <group>
            <perspectiveCamera ref={camera}/>
            {camera.current && (
                <>
                    <orbitControls
                        ref={controls}
                        args={[camera.current, root]}
                        enableDamping={true}
                        dampingFactor={0.1}
                        rotateSpeed={0.1}/>
                    <scene ref={scene}>
                        <mesh
                            key="Triangles"
                            ref={triangleMesh}
                            geometry={fabric.facesGeometry}
                            material={TENSEGRITY_FACE}
                            onPointerDown={onMouseDownCapture}
                        />
                        <lineSegments
                            key="Lines"
                            geometry={fabric.linesGeometry}
                            material={TENSEGRITY_LINE}/>
                        <SurfaceComponent/>
                    </scene>
                </>
            )}
        </group>
    )
}
