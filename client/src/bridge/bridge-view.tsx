/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { FaDownload, FaFile, FaFileCsv, FaSignOutAlt } from "react-icons/all"
import { Canvas, DomEvent, useFrame, useThree, useUpdate } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { Color, Euler, PerspectiveCamera, Quaternion, Vector3 } from "three"

import { stageName, switchToVersion, Version } from "../fabric/eig-util"
import { Life } from "../fabric/life"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval } from "../fabric/tensegrity-types"
import { JOINT_RADIUS, PULL_RADIUS, PUSH_RADIUS, SPACE_RADIUS, SPACE_SCALE } from "../pretenst"
import { IFabricOutput, saveCSVZip, saveJSONZip } from "../storage/download"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { Orbit } from "../view/orbit"
import { SurfaceComponent } from "../view/surface-component"

import { IHook, ribbon, SHAPING_TIME } from "./bridge-logic"

export function BridgeView({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {

    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

    function getFabricOutput(): IFabricOutput {
        return tensegrity.getFabricOutput(PUSH_RADIUS, PULL_RADIUS, JOINT_RADIUS)
    }

    return (
        <div id="view-container" style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <div id="top-middle">
                {stageName(life.stage)}
            </div>
            <div id="bottom-right">
                <ButtonGroup vertical={false}>
                    <Button
                        onClick={() => saveCSVZip(getFabricOutput())}><FaDownload/>
                        <FaFileCsv/></Button>
                    <Button onClick={() => saveJSONZip(getFabricOutput())}><FaDownload/> <FaFile/></Button>
                    <Button onClick={() => switchToVersion(Version.Design)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
            <Canvas style={{backgroundColor: "black"}}>
                <Camera/>
                {!tensegrity ? <h1>No bridge</h1> : <BridgeScene tensegrity={tensegrity} life={life}/>}
            </Canvas>
        </div>
    )
}

function BridgeScene({tensegrity, life}: { tensegrity: Tensegrity, life: Life }): JSX.Element {
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

    const [showLines] = useState(true)
    const [tick, setTick] = useState(0)
    // const [lengthsAdopted, setLengthsAdopted] = useState(false)
    const [strainToStiffness, setStrainToStiffness] = useState(false)
    const [hooks, setHooks] = useState<IHook[][]>([])

    useFrame(() => {
        const control: Orbit = orbit.current
        control.target.copy(tensegrity.instance.midpoint)
        control.update()
        const nextStage = tensegrity.iterate()
        switch (nextStage) {
            case Stage.Growing:
                setTick(tick + 1)
                break
            case Stage.Shaping:
                if (life.stage === Stage.Growing) {
                    tensegrity.transition = {stage: Stage.Shaping}
                    setTick(0)
                    break
                }
                if (tick < SHAPING_TIME) {
                    setTick(tick + 1)
                    break
                }
                if (tick === SHAPING_TIME) {
                    console.log("Ribbon!")
                    setHooks(ribbon(tensegrity))
                    control.autoRotate = true
                    control.rotateSpeed = 5
                    tensegrity.transition = {stage: Stage.Slack, adoptLengths: true}
                    setTick(0)
                }
                break
            case Stage.Slack:
                tensegrity.transition = {stage: Stage.Pretensing}
                setTick(0)
                break
            case Stage.Pretensing:
                setTick(tick + 1)
                break
            case Stage.Pretenst:
                if (life.stage === Stage.Pretensing) {
                    tensegrity.transition = {stage: Stage.Pretenst}
                    setTick(0)
                    break
                }
                if (tick === 200) {
                    // if (!lengthsAdopted) {
                    //     setLengthsAdopted(true)
                    //     console.log("adopt lengths")
                    //     tensegrity.transition = {stage: Stage.Slack, adoptLengths: true}
                    // } else
                    if (!strainToStiffness) {
                        setStrainToStiffness(true)
                        console.log("strain to stiffness", strainToStiffness)
                        tensegrity.transition = {stage: Stage.Slack, strainToStiffness: true}
                    }
                }
                setTick(tick + 1)
                break
            default:
                setTick(tick + 1)
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
                        {tensegrity.intervals.map(interval => (
                            <IntervalMesh key={`I${interval.index}`} tensegrity={tensegrity} interval={interval}/>
                        ))}
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

function IntervalMesh({tensegrity, interval, onPointerDown}: {
    tensegrity: Tensegrity,
    interval: IInterval,
    onPointerDown?: (event: DomEvent) => void,
}): JSX.Element | null {
    const unit = tensegrity.instance.unitVector(interval.index)
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), unit)
    const length = interval.alpha.location().distanceTo(interval.omega.location())
    const intervalRadius = interval.isPush ? PUSH_RADIUS : PULL_RADIUS
    const intervalScale = new Vector3(intervalRadius, length + (interval.isPush ? -JOINT_RADIUS * 2 : 0), intervalRadius)
    const jointScale = new Vector3(JOINT_RADIUS, JOINT_RADIUS, JOINT_RADIUS)
    return (
        <>
            {interval.isPush ? (
                <>
                    <mesh
                        position={interval.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        onPointerDown={onPointerDown}
                    >
                        <meshLambertMaterial attach="material" color={new Color("#bd7b14")}/>
                        <cylinderGeometry attach="geometry" args={[0.5, 0.5, 1, 6, 1]}/>
                    </mesh>
                    <mesh
                        position={interval.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    >
                        <meshLambertMaterial attach="material" color={new Color("#ec8700")}/>
                        <cylinderGeometry attach="geometry" args={[1, 1, 0.85, 12, 1]}/>
                    </mesh>
                    <mesh
                        position={interval.alpha.location()}
                        scale={jointScale}
                        onPointerDown={onPointerDown}
                    >
                        <sphereGeometry attach="geometry" args={[1, 32, 8]}/>
                        <meshPhongMaterial attach="material" color={new Color("#2bc19d")}/>
                    </mesh>
                    <mesh
                        position={interval.omega.location()}
                        scale={jointScale}
                        onPointerDown={onPointerDown}
                    >
                        <sphereGeometry attach="geometry" args={[1, 32, 8]}/>
                        <meshPhongMaterial attach="material" color={new Color("#2bc19d")}/>
                    </mesh>
                </>
            ) : (
                <mesh
                    position={interval.location()}
                    rotation={new Euler().setFromQuaternion(rotation)}
                    scale={intervalScale}
                    onPointerDown={onPointerDown}
                >
                    <meshLambertMaterial attach="material" color={new Color("#faf8f8")}/>
                    <cylinderGeometry attach="geometry" args={[1, 1, 1, 6, 1]}/>
                </mesh>
            )}
        </>
    )
}

function HookMesh({hook}: { hook: IHook }): JSX.Element {
    const radius = 0.04
    const jointScale = new Vector3(radius, radius, radius)
    const {face} = hook
    return (
        <>
            {face.ends.map(j => (
                <mesh
                    key={`hook-${j.index}`}
                    position={j.location()}
                    scale={jointScale}
                    matrixWorldNeedsUpdate={true}
                >
                    <sphereGeometry attach="geometry" args={[1, 32, 8]}/>
                    <meshPhongMaterial attach="material" color={new Color("#43d903")}/>
                </mesh>
            ))}
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
        camera.position.set(35, 10, 30)
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

