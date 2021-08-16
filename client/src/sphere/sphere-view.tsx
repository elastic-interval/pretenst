/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { FaDownload, FaSignOutAlt, FaSnowflake } from "react-icons/all"
import { OrbitControls, Stars } from "react-three-drei-without-subdivision"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { atom, useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState } from "recoil"
import { Color, CylinderGeometry, Euler, Material, MeshLambertMaterial, PerspectiveCamera, Vector3 } from "three"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { intervalRotation } from "../fabric/tensegrity-types"
import { saveCSVZip } from "../storage/download"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"

import { IPull, IPush, TensegritySphere } from "./tensegrity-sphere"

export const SPHERE_RADIUS = 15

const PUSH_RADIUS = 0.004 * SPHERE_RADIUS
const PULL_RADIUS = 0.002 * SPHERE_RADIUS

function material(colorString: string): Material {
    const color = new Color(colorString)
    return new MeshLambertMaterial({color})
}

const PUSH_MATERIAL = material("#011884")
const PULL_MATERIAL = material("#a80000")

const FREQUENCY_CHOICES = [1, 2, 3, 4, 5]

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
export const useGravityAtom = atom({
    key: "useGravity",
    default: true,
})

export function SphereView({frequencyParam, createSphere}: {
    frequencyParam?: string,
    createSphere: (frequency: number, useGravity: boolean) => TensegritySphere,
}): JSX.Element {
    const frequencyChoice = useMemo(() => {
        const frequency = (frequencyParam === undefined) ? 1 : parseInt(frequencyParam, 10)
        const index = FREQUENCY_CHOICES.findIndex(c => c === frequency)
        return index >= 0 ? index : 0
    }, [])
    const [frozen, setFrozen] = useRecoilState(frozenAtom)
    const [showPush, setShowPush] = useRecoilState(showPushAtom)
    const [showPull, setShowPull] = useRecoilState(showPullAtom)
    const [useGravity, setUseGravity] = useRecoilState(useGravityAtom)
    const [sphere, setSphere] = useState(() => createSphere(FREQUENCY_CHOICES[frequencyChoice], useGravity))

    useEffect(() => {
        setFrozen(false)
        setSphere(createSphere(FREQUENCY_CHOICES[frequencyChoice], useGravity))
    }, [useGravity, frequencyChoice])

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
                    <Button color="warning" onClick={() => reloadGlobalMode(GlobalMode.Choice)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
            <div id="top-left">
                <ButtonGroup>
                    {FREQUENCY_CHOICES.map((freq, index) => (
                        <Button key={`Freq${freq}`} onClick={() => reloadGlobalMode(GlobalMode.Sphere, freq.toFixed(0))}
                                color={index === frequencyChoice ? "success" : "secondary"}>
                            {freq}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>
            <div id="top-right">
                <ButtonGroup>
                    <Button color={useGravity ? "success" : "secondary"}
                            onClick={() => setUseGravity(true)}>Gravity</Button>
                    <Button color={!useGravity ? "success" : "secondary"}
                            onClick={() => setUseGravity(false)}>Space</Button>
                </ButtonGroup>
            </div>
            <div id="bottom-left">
                <ButtonGroup>
                    <Button color={frozen ? "success" : "secondary"}
                            onClick={() => setFrozen(!frozen)}><FaSnowflake/></Button>
                    <Button color={showPush ? "success" : "secondary"}
                            disabled={!frozen}
                            onClick={() => setShowPush(!showPush)}>C</Button>
                    <Button color={showPull ? "success" : "secondary"}
                            disabled={!frozen}
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
    const [target, setTarget] = useState(new Vector3())
    const [frozen, setFrozen] = useRecoilState(frozenAtom)

    useFrame(() => {
        if (!frozen) {
            sphere.iterate(() => setTimeout(() => setFrozen(true), 0))
            const toMidpoint = new Vector3().subVectors(sphere.instance.midpoint, target).multiplyScalar(0.1)
            setTarget(new Vector3().copy(target).add(toMidpoint))
        }
    })
    return (
        <group>
            <OrbitControls target={target}/>
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
                <Stars/>
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
    const instance = sphere.instance
    return (
        <group>
            {!showPull ? undefined : sphere.pulls.map((pull: IPull) => {
                const rotation = intervalRotation(instance.unitVector(pull.index))
                const length = instance.jointDistance(pull.alpha, pull.omega)
                const intervalScale = new Vector3(PULL_RADIUS, length, PULL_RADIUS)
                return (
                    <mesh
                        key={`T${pull.index}`}
                        geometry={CYLINDER}
                        position={pull.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={PULL_MATERIAL}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}}
            {!showPush ? undefined : sphere.pushes.map((push: IPush) => {
                const rotation = intervalRotation(instance.unitVector(push.index))
                const length = instance.jointDistance(push.alpha, push.omega)
                const intervalScale = new Vector3(PUSH_RADIUS, length, PUSH_RADIUS)
                return (
                    <mesh
                        key={`C${push.index}`}
                        geometry={CYLINDER}
                        position={push.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={PUSH_MATERIAL}
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
        camera.position.set(0, SPHERE_RADIUS, SPHERE_RADIUS * 2.6)
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
