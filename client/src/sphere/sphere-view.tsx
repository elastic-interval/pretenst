/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls } from "@react-three/drei"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { FaCamera, FaDownload, FaSignOutAlt } from "react-icons/all"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { atom, useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState } from "recoil"
import {
    Color,
    CylinderGeometry,
    Euler,
    Material,
    MeshLambertMaterial,
    PerspectiveCamera,
    Quaternion,
    Vector3,
} from "three"

import { GlobalMode, reloadGlobalMode, UP } from "../fabric/eig-util"
import { jointDistance } from "../fabric/tensegrity-types"
import { saveCSVZip } from "../storage/download"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"

import { IPull, IPush, TensegritySphere } from "./tensegrity-sphere"

const PUSH_RADIUS = 0.006
const PULL_RADIUS = 0.002

interface ILengthRange {
    material: Material,
    low: number
    high: number
}

function material(colorString: string): Material {
    const color = new Color(colorString)
    return new MeshLambertMaterial({color})
}

const SEGMENT_MATERIAL = material("#1818a3")

const PUSH_RANGES: ILengthRange[] = [
    {material: material("#dd0dec"), low: 0.54, high: 0.57},
    {material: material("#f5c30c"), low: 0.60, high: 0.63},
]

const PULL_RANGES: ILengthRange[] = [
    {material: material("#118d11"), low: 0.15, high: 0.17},
    {material: material("#930606"), low: 0.22, high: 0.24},
]

function findMaterial(idealLength: number, choices: ILengthRange[]): Material {
    const found = choices.find(({low, high}) => idealLength > low && idealLength < high)
    if (!found) {
        console.log("weird ideal", idealLength)
        return material("#000000")
    }
    return found.material
}

const FREQUENCY = 2

export const showPushAtom = atom({
    key: "show push",
    default: true,
})
export const showPullAtom = atom({
    key: "show pull",
    default: true,
})
export const frozenAtom = atom({
    key: "frozen",
    default: false,
})

export function SphereView({createSphere}: { createSphere: (frequency: number) => TensegritySphere }): JSX.Element {
    const [frozen, setFrozen] = useRecoilState(frozenAtom)
    const [showPush, setShowPush] = useRecoilState(showPushAtom)
    const [showPull, setShowPull] = useRecoilState(showPullAtom)
    const [sphere] = useState(() => createSphere(FREQUENCY))
    useEffect(() => {
        if (!showPush && !showPull) {
            setShowPush(true)
            setShowPull(true)
        }
    }, [showPush, showPull])
    const RecoilBridge = useRecoilBridgeAcrossReactRoots_UNSTABLE()
    return (
        <div style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <div id="bottom-right">
                <ButtonGroup>
                    <Button onClick={() => saveCSVZip(sphere.fabricOutput)}><FaDownload/></Button>
                    <Button onClick={() => setFrozen(!frozen)}><FaCamera/></Button>
                    <Button onClick={() => reloadGlobalMode(GlobalMode.Design)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
            <div id="bottom-left">
                <ButtonGroup>
                    <Button color={showPush ? "success" : "secondary"}
                            onClick={() => setShowPush(!showPush)}>C</Button>
                    <Button color={showPull ? "success" : "secondary"}
                            onClick={() => setShowPull(!showPull)}>T</Button>
                </ButtonGroup>
            </div>
            <Canvas style={{backgroundColor: "black"}}>
                <SphereCamera/>
                <RecoilBridge>
                    {!sphere ? <h1>No Sphere</h1> : <SphereScene sphere={sphere}/>}
                </RecoilBridge>
            </Canvas>
        </div>
    )
}

export function SphereScene({sphere}: { sphere: TensegritySphere }): JSX.Element {
    const [tick, setTick] = useState(0)
    const [target, setTarget] = useState(new Vector3())
    const [frozen, setFrozen] = useRecoilState(frozenAtom)

    useFrame(() => {
        if (!frozen) {
            sphere.iterate(() => setTimeout(() => setFrozen(true), 0))
        }
        const toMidpoint = new Vector3().subVectors(sphere.instance.midpoint, target).multiplyScalar(0.1)
        setTarget(new Vector3().copy(target).add(toMidpoint))
        setTick(tick + 1)
    })
    return (
        <group>
            <OrbitControls onPointerMissed={undefined} target={target}/>
            <scene>
                {frozen ? (
                    <PolygonView sphere={sphere}/>
                ) : (
                    <lineSegments
                        key="lines"
                        geometry={sphere.instance.floatView.lineGeometry}
                        material={LINE_VERTEX_COLORS}
                        onUpdate={self => self.geometry.computeBoundingSphere()}
                    />
                )}
                <SurfaceComponent/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)

function PolygonView({sphere}: { sphere: TensegritySphere }): JSX.Element {
    const [showPush] = useRecoilState(showPushAtom)
    const [showPull] = useRecoilState(showPullAtom)
    return (
        <group>
            {!showPull ? undefined : sphere.pulls.map((pull: IPull) => {
                const unit = sphere.instance.unitVector(pull.index)
                const rotation = new Quaternion().setFromUnitVectors(UP, unit)
                const length = jointDistance(pull.alpha, pull.omega)
                const intervalScale = new Vector3(PULL_RADIUS, length, PULL_RADIUS)
                return (
                    <mesh
                        key={`T${pull.index}`}
                        geometry={CYLINDER}
                        position={pull.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={pull.segment ? SEGMENT_MATERIAL : findMaterial(pull.idealLength, PULL_RANGES)}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}}
            {!showPush ? undefined : sphere.pushes.map((push: IPush) => {
                const unit = sphere.instance.unitVector(push.index)
                const rotation = new Quaternion().setFromUnitVectors(UP, unit)
                const length = jointDistance(push.alpha, push.omega)
                const intervalScale = new Vector3(PUSH_RADIUS, length, PUSH_RADIUS)
                return (
                    <mesh
                        key={`C${push.index}`}
                        geometry={CYLINDER}
                        position={push.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={findMaterial(push.idealLength, PUSH_RANGES)}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}}
        </group>
    )
}

function SphereCamera(props: object): JSX.Element {
    const ref = useRef<PerspectiveCamera>()
    const {setDefaultCamera} = useThree()
    // Make the camera known to the system
    useEffect(() => {
        const camera = ref.current
        if (!camera) {
            throw new Error("No camera")
        }
        camera.fov = 50
        camera.position.set(0, 4, 2.5)
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
