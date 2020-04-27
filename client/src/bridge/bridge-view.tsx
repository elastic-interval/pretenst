/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, Stage } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, DomEvent, useFrame, useThree, useUpdate } from "react-three-fiber"
import { Color, Euler, PerspectiveCamera, Quaternion, Vector3 } from "three"

import { stageName } from "../fabric/eig-util"
import { Life } from "../fabric/life"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval } from "../fabric/tensegrity-types"
import { SPACE_RADIUS, SPACE_SCALE } from "../gotchi/island-geometry"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { Orbit } from "../view/orbit"
import { SurfaceComponent } from "../view/surface-component"

import { IHook, ribbon } from "./bridge-logic"

const SHAPING_TIME = 250
const SLACK_TIME = 20

export function BridgeView({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {

    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

    return (
        <div id="view-container" style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <div id="top-middle">
                {stageName(life.stage)}
            </div>
            <Canvas style={{backgroundColor: "black"}}>
                <Camera/>
                {!tensegrity ? <h1>No bridge</h1> : <BridgeScene tensegrity={tensegrity} life={life}/>}
            </Canvas>
        </div>
    )
}

export function BridgeScene({tensegrity, life}: { tensegrity: Tensegrity, life: Life }): JSX.Element {
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    const viewContainer = document.getElementById("view-container") as HTMLElement

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

    const [showLines, setShowLines] = useState(true)

    const [busyTick, setBusyTick] = useState(0)
    const [growingTick, setGrowingTick] = useState(0)
    const [shapingTick, setShapingTick] = useState(0)
    const [slackTick, setSlackTick] = useState(0)
    const [pretensingTick, setPretensingTick] = useState(0)
    const [ribbonTick, setRibbonTick] = useState(0)

    const [hooks, setHooks] = useState<IHook[][]>([])

    useFrame(() => {
        const control: Orbit = orbit.current
        if (ribbonTick > 1000) {
            return
        }
        const nextStage = tensegrity.iterate()
        control.target.copy(tensegrity.instance.midpoint)
        control.update()
        switch (nextStage) {
            case Stage.Growing:
                setGrowingTick(growingTick + 1)
                break
            case Stage.Shaping:
                if (life.stage === Stage.Growing) {
                    tensegrity.transition = {stage: Stage.Shaping}
                    break
                }
                if (shapingTick < SHAPING_TIME) {
                    setShapingTick(shapingTick + 1)
                    break
                }
                if (ribbonTick === 0) {
                    console.log("Ribbon!")
                    setHooks(ribbon(tensegrity, 15))
                }
                if (ribbonTick === 5) {
                    setShowLines(false)
                    control.autoRotate = true
                    tensegrity.transition = {stage: Stage.Slack, adoptLengths: true}
                }
                // if (ribbonTick === 50) {
                //     for (let arch = 0; arch < 4; arch++) {
                //         console.log("hooks " + arch, hooks[arch].map(h => `${h.arch}:${h.distance}:${h.face.joints[h.jointIndex].location().x.toFixed(2)}`))
                //     }
                // }
                setRibbonTick(ribbonTick + 1)
                break
            case Stage.Slack:
                if (slackTick < SLACK_TIME) {
                    setSlackTick(slackTick + 1)
                    break
                }
                tensegrity.transition = {stage: Stage.Pretensing}
                break
            case Stage.Pretensing:
                setPretensingTick(pretensingTick + 1)
                // console.log("pretensing", pretensingTick)
                break
            case Stage.Pretenst:
                if (life.stage === Stage.Pretensing) {
                    tensegrity.transition = {stage: Stage.Pretenst}
                }
                break
            default:
                setBusyTick(busyTick + 1)
                break
        }
    })
    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                {showLines ? (
                    <lineSegments
                        key="lines"
                        geometry={tensegrity.instance.floatView.lineGeometry}
                        material={LINE_VERTEX_COLORS}
                    />
                ) : (
                    <>
                        {tensegrity.intervals.map(interval => {
                            const radiusFeature = interval.isPush ? FabricFeature.PushRadius : FabricFeature.PullRadius
                            const radiusFactor = tensegrity.numericFeature(radiusFeature)
                            const jointRadiusFactor = tensegrity.numericFeature(FabricFeature.JointRadius)
                            return (
                                <IntervalMesh
                                    key={`I${interval.index}`}
                                    tensegrity={tensegrity}
                                    interval={interval}
                                    radiusFactor={radiusFactor}
                                    jointRadiusFactor={jointRadiusFactor}
                                />
                            )
                        })}
                        {hooks.map(hookArray => hookArray.map(hook => <HookMesh key={hook.name} hook={hook}/>))}
                    </>
                )}
                <SurfaceComponent/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function IntervalMesh({tensegrity, interval, radiusFactor, jointRadiusFactor, onPointerDown}: {
    tensegrity: Tensegrity,
    interval: IInterval,
    radiusFactor: number,
    jointRadiusFactor: number,
    onPointerDown?: (event: DomEvent) => void,
}): JSX.Element | null {
    const linearDensity = tensegrity.instance.floatView.linearDensities[interval.index]
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
                        position={interval.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    >
                        <meshLambertMaterial color="yellow" attach="material"/>
                        <cylinderGeometry attach="geometry" args={[0.5, 0.5, 1, 6, 1]}/>
                    </mesh>
                    <mesh
                        position={interval.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    >
                        <meshLambertMaterial color="green" attach="material"/>
                        <cylinderGeometry attach="geometry" args={[1, 1, 0.85, 12, 1]}/>
                    </mesh>
                    <mesh
                        position={interval.alpha.location()}
                        scale={jointScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    >
                        <sphereGeometry attach="geometry" args={[1, 32, 8]}/>
                        <meshPhongMaterial attach="material" color="#e83ada"/>
                    </mesh>
                    <mesh
                        position={interval.omega.location()}
                        scale={jointScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    >
                        <sphereGeometry attach="geometry" args={[1, 32, 8]}/>
                        <meshPhongMaterial attach="material" color="#e83ada"/>
                    </mesh>
                </>
            ) : (
                <mesh
                    position={interval.location()}
                    rotation={new Euler().setFromQuaternion(rotation)}
                    scale={intervalScale}
                    matrixWorldNeedsUpdate={true}
                    onPointerDown={onPointerDown}
                >
                    <meshLambertMaterial color="red" attach="material"/>
                    <cylinderGeometry attach="geometry" args={[1, 1, 1, 6, 1]}/>
                </mesh>
            )}
        </>
    )
}

function HookMesh({hook}: { hook: IHook }): JSX.Element {
    const radius = 0.05
    const jointScale = new Vector3(radius, radius, radius)
    const {face, jointIndex} = hook
    const joint = face.joints[jointIndex]
    return (
        <mesh
            position={joint.location()}
            scale={jointScale}
            matrixWorldNeedsUpdate={true}
        >
            <sphereGeometry attach="geometry" args={[1, 32, 8]}/>
            <meshPhongMaterial attach="material" color={new Color("#ffffff")}/>
        </mesh>
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
        camera.position.set(14, 3, 1)
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

