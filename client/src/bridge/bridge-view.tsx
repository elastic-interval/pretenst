/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, DomEvent, useFrame, useThree, useUpdate } from "react-three-fiber"
import { Color, CylinderGeometry, Euler, PerspectiveCamera, Quaternion, SphereGeometry, Vector3 } from "three"

import { Tensegrity } from "../fabric/tensegrity"
import { IInterval } from "../fabric/tensegrity-types"
import { SPACE_RADIUS, SPACE_SCALE } from "../gotchi/island-geometry"
import { JOINT_MATERIAL } from "../view/materials"
import { Orbit } from "../view/orbit"
import { SurfaceComponent } from "../view/surface-component"

const PUSH_RADIUS_FACTOR = 6
const PULL_RADIUS_FACTOR = 2
const JOINT_RADIUS_FACTOR = 1

export function BridgeView({tensegrity}: {
    tensegrity: Tensegrity,
}): JSX.Element {
    return (
        <div id="view-container" style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "100%",
        }}>
            <Canvas style={{backgroundColor: "black"}}>
                <Camera/>
                {!tensegrity ? <h1>No bridge</h1> : <BridgeScene tensegrity={tensegrity}/>}
            </Canvas>
        </div>
    )
}

export function BridgeScene({tensegrity}: {
    tensegrity: Tensegrity,
}): JSX.Element {
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    const viewContainer = document.getElementById("view-container") as HTMLElement

    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

    const orbit = useUpdate<Orbit>(orb => {
        orb.minPolarAngle = 0
        orb.maxPolarAngle = Math.PI / 2
        orb.minDistance = 0.1
        orb.maxDistance = SPACE_RADIUS * SPACE_SCALE * 0.9
        orb.zoomSpeed = 0.5
        orb.enableZoom = true
        orb.target.set(0, 50, 0)
        orb.update()
    }, [])

    const [whyThis, updateWhyThis] = useState(0)
    const [shapingTime, setShapingTime] = useState(50)

    useFrame(() => {
        const control: Orbit = orbit.current
        const nextStage = tensegrity.iterate()
        const instance = tensegrity.instance
        control.target.copy(instance.midpoint)
        control.update()
        if (life.stage === Stage.Pretensing && nextStage === Stage.Pretenst) {
            tensegrity.transition = {stage: Stage.Pretenst}
        } else if (nextStage !== undefined && nextStage !== life.stage && life.stage !== Stage.Pretensing) {
            tensegrity.transition = {stage: nextStage}
        }
        switch (nextStage) {
            case Stage.Shaping:
                if (shapingTime <= 0) {
                    instance.fabric.adopt_lengths()
                    const faceIntervals = [...tensegrity.faceIntervals]
                    faceIntervals.forEach(interval => tensegrity.removeFaceInterval(interval))
                    instance.iterate(Stage.Slack)
                    instance.iterate(Stage.Pretensing)
                } else {
                    setShapingTime(shapingTime - 1)
                }
                break
            default:
                updateWhyThis(whyThis + 1)
                break
        }
    })

    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                {tensegrity.intervals.map(interval => (
                    <IntervalMesh
                        key={`I${interval.index}`}
                        tensegrity={tensegrity}
                        interval={interval}
                        radiusFactor={interval.isPush ? PUSH_RADIUS_FACTOR : PULL_RADIUS_FACTOR}
                        jointRadiusFactor={JOINT_RADIUS_FACTOR}
                    />
                ))}}
                <SurfaceComponent/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

const SPHERE = new SphereGeometry(1, 32, 8)
const PULL_CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)
const PUSH_CYLINDER_INNER = new CylinderGeometry(0.5, 0.5, 1, 6, 1, false)
const PUSH_CYLINDER_OUTER = new CylinderGeometry(1, 1, 0.85, 12, 1, false)

function IntervalMesh({tensegrity, interval, radiusFactor, jointRadiusFactor, onPointerDown}: {
    tensegrity: Tensegrity,
    interval: IInterval,
    radiusFactor: number,
    jointRadiusFactor: number,
    onPointerDown?: (event: DomEvent) => void,
}): JSX.Element | null {
    const linearDensity = tensegrity.instance.floatView.linearDensities[interval.index]
    // const radiusFeature = storedState.featureValues[interval.isPush ? FabricFeature.PushRadius : FabricFeature.PullRadius]
    const radius = radiusFactor * linearDensity
    const unit = tensegrity.instance.unitVector(interval.index)
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), unit)
    const length = interval.alpha.location().distanceTo(interval.omega.location())
    const jointRadius = radius * jointRadiusFactor
    const intervalScale = new Vector3(radius, length + (interval.isPush ? -jointRadius * 2 : 0), radius)
    const jointScale = new Vector3(jointRadius, jointRadius, jointRadius)
    return (
        <>
            {interval.isPush ? (
                <>
                    <mesh
                        geometry={PUSH_CYLINDER_INNER}
                        position={interval.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    >
                        <meshLambertMaterial color="yellow" attach="material"/>
                    </mesh>
                    <mesh
                        geometry={PUSH_CYLINDER_OUTER}
                        position={interval.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    >
                        <meshLambertMaterial color="green" attach="material"/>
                    </mesh>
                    <mesh
                        geometry={SPHERE}
                        position={interval.alpha.location()}
                        material={JOINT_MATERIAL}
                        scale={jointScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    />
                    <mesh
                        geometry={SPHERE}
                        position={interval.omega.location()}
                        material={JOINT_MATERIAL}
                        scale={jointScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    />
                </>
            ) : (
                <mesh
                    geometry={PULL_CYLINDER}
                    position={interval.location()}
                    rotation={new Euler().setFromQuaternion(rotation)}
                    scale={intervalScale}
                    matrixWorldNeedsUpdate={true}
                    onPointerDown={onPointerDown}
                >
                    <meshLambertMaterial color="red" attach="material"/>
                </mesh>
            )}
        </>
    )
}

function Camera(props: object): JSX.Element {
    const ref = useRef<PerspectiveCamera>()
    const {setDefaultCamera} = useThree()
    // Make the camera known to the system
    useEffect(() => {
        const camera = ref.current
        if (!camera) {
            throw new Error("No camera")
        }
        camera.fov = 50
        camera.position.set(14, 1, 1)
        setDefaultCamera(camera)
    }, [])
    // Update it every frame
    useFrame(() => {
        const camera = ref.current
        if (!camera) {
            throw new Error("No camera")
        }
        camera.updateMatrixWorld()
    })
    return <perspectiveCamera ref={ref} {...props} />
}
