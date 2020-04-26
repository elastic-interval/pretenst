/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole, Stage } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, DomEvent, useFrame, useThree, useUpdate } from "react-three-fiber"
import { Color, Euler, PerspectiveCamera, Quaternion, Vector3 } from "three"

import { stageName } from "../fabric/eig-util"
import { Life } from "../fabric/life"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, IInterval, IJoint, percentOrHundred, Triangle, TRIANGLE_DEFINITIONS } from "../fabric/tensegrity-types"
import { SPACE_RADIUS, SPACE_SCALE } from "../gotchi/island-geometry"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { Orbit } from "../view/orbit"
import { SurfaceComponent } from "../view/surface-component"

const SHAPING_TIME = 250
const SLACK_TIME = 20
const RIBBON_HEIGHT = 1

export function BridgeView({tensegrity}: {
    tensegrity: Tensegrity,
}): JSX.Element {

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

    const [hooks, setHooks] = useState<IHook[]>([])

    useFrame(() => {
        const control: Orbit = orbit.current
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
                    setHooks(ribbon(tensegrity, 10))
                }
                setRibbonTick(ribbonTick + 1)
                if (ribbonTick === 5) {
                    setShowLines(false)
                    control.autoRotate = true
                    // tensegrity.transition = {stage: Stage.Slack, adoptLengths: true}
                }
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
                console.log("pretensing", pretensingTick)
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
                        {hooks.map(hook => <HookMesh key={hook.name} hook={hook}/>)}
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

function ribbon(tensegrity: Tensegrity, size: number): IHook[] {
    const joint = (x: number, left: boolean): IJoint => {
        const z = left ? -1 : 1
        const location = new Vector3(x, RIBBON_HEIGHT, z)
        const jointIndex = tensegrity.createJoint(location)
        return {
            index: jointIndex,
            oppositeIndex: -1,
            location: () => tensegrity.instance.jointLocation(jointIndex),
        }
    }
    const interval = (alpha: IJoint, omega: IJoint, intervalRole: IntervalRole): IInterval =>
        tensegrity.createInterval(alpha, omega, intervalRole, percentOrHundred(), 1000)
    const L0 = joint(0, true)
    const R0 = joint(0, false)
    const LF: IJoint[] = [L0]
    const RF: IJoint[] = [R0]
    const LB: IJoint[] = [L0]
    const RB: IJoint[] = [R0]
    for (let walk = 1; walk < size; walk++) {
        LF.push(joint(walk, true))
        RF.push(joint(walk, false))
        LB.push(joint(-walk, true))
        RB.push(joint(-walk, false))
    }
    tensegrity.instance.refreshFloatView()
    interval(L0, R0, IntervalRole.RibbonLongPull)
    const joints = (index: number) => [LF[index], RF[index], LB[index], RB[index]]
    for (let walk = 1; walk < size; walk++) {
        const prev = joints(walk - 1)
        const curr = joints(walk)
        interval(curr[0], curr[1], IntervalRole.RibbonLongPull)
        interval(curr[2], curr[3], IntervalRole.RibbonLongPull)
        for (let short = 0; short < 4; short++) {
            interval(prev[short], curr[short], IntervalRole.RibbonShortPull)
        }
    }
    interval(LF[1], RB[1], IntervalRole.RibbonPush)
    interval(RF[1], LB[1], IntervalRole.RibbonPush)
    for (let walk = 2; walk < size; walk++) {
        const prev = joints(walk - 2)
        const curr = joints(walk)
        interval(prev[0], curr[1], IntervalRole.RibbonPush)
        interval(prev[1], curr[0], IntervalRole.RibbonPush)
        interval(prev[2], curr[3], IntervalRole.RibbonPush)
        interval(prev[3], curr[2], IntervalRole.RibbonPush)
    }
    return extractHooks(tensegrity).filter(hook => hook.distance <= 5).filter(hookFilter)
}

enum Arch {
    FrontLeft,
    FrontRight,
    BackLeft,
    BackRight,
}

interface IHook {
    face: IFace
    name: string
    arch: Arch
    distance: number
    group: Triangle
    triangle: Triangle
    jointIndex: number
}

function hookFilter(hook: IHook): boolean {
    switch (hook.triangle) {
        case Triangle.NPN:
            return hook.jointIndex !== 2 && hook.arch === Arch.BackRight
        case Triangle.NNP:
            return hook.jointIndex !== 0 && hook.arch === Arch.FrontRight
        case Triangle.PNP:
            return hook.jointIndex !== 2 && hook.arch === Arch.BackLeft
        case Triangle.PPN:
            return hook.jointIndex !== 1 && hook.arch === Arch.FrontLeft
        default:
            return false
    }
}

function extractHooks(tensegrity: Tensegrity): IHook[] {
    const hooks: IHook[] = []
    const faces = tensegrity.faces.filter(face => !face.removed && face.brick.parentFace)
    faces.forEach(face => {
        const gatherAncestors = (f: IFace, id: Triangle[]): Arch => {
            const definition = TRIANGLE_DEFINITIONS[f.triangle]
            id.push(definition.negative ? definition.opposite : definition.name)
            const parentFace = f.brick.parentFace
            if (parentFace) {
                return gatherAncestors(parentFace, id)
            } else {
                return archFromTriangle(f.triangle)
            }
        }
        const identities: Triangle[] = []
        const arch = gatherAncestors(face, identities)
        const group = identities.shift()
        if (!group) {
            throw new Error("no top!")
        }
        if (group && isTriangleExtremity(group)) {
            return
        }
        const triangle = face.triangle
        const distance = identities.length
        for (let jointIndex = 0; jointIndex < 3; jointIndex++) {
            const name = `[${arch}]:[${distance}:${Triangle[group]}]:{tri=${Triangle[triangle]}}:{j=${jointIndex}}`
            hooks.push({face, name, arch, distance, group, triangle, jointIndex})
        }
    })
    return hooks
}

function archFromTriangle(triangle: Triangle): Arch {
    switch (triangle) {
        case Triangle.NNN:
            return Arch.BackLeft
        case Triangle.PNN:
            return Arch.BackRight
        case Triangle.NPP:
            return Arch.FrontLeft
        case Triangle.PPP:
            return Arch.FrontRight
        default:
            throw new Error("Strange arch")
    }
}

function isTriangleExtremity(triangle: Triangle): boolean {
    const definition = TRIANGLE_DEFINITIONS[triangle]
    const normalizedTriangle = definition.negative ? definition.opposite : triangle
    return normalizedTriangle === Triangle.PPP
}

