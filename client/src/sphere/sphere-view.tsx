/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
import { OrbitControls, Stars } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { FaDownload, FaSignOutAlt, FaSnowflake } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { atom, useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState } from "recoil"
import { Color, CylinderGeometry, Euler, Material, MeshLambertMaterial, Vector3 } from "three"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { intervalRotation } from "../fabric/tensegrity-types"
import { getFabricOutput, saveCSVZip } from "../storage/download"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"

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
export const gravityAtom = atom({
    key: "gravity",
    default: 2,
})
export const useCurvesAtom = atom({
    key: "useCurves",
    default: false,
})

export function SphereView({frequencyParam, createSphere}: {
    frequencyParam?: string,
    createSphere: (frequency: number, gravity: number, useCurves: boolean) => Tensegrity,
}): JSX.Element {
    const frequencyChoice = useMemo(() => {
        const frequency = (frequencyParam === undefined) ? 1 : parseInt(frequencyParam, 10)
        const index = FREQUENCY_CHOICES.findIndex(c => c === frequency)
        return index >= 0 ? index : 0
    }, [])
    const [frozen, setFrozen] = useRecoilState(frozenAtom)
    const [showPush, setShowPush] = useRecoilState(showPushAtom)
    const [showPull, setShowPull] = useRecoilState(showPullAtom)
    const [gravity, setGravity] = useRecoilState(gravityAtom)
    const [useCurves] = useRecoilState(useCurvesAtom)
    const [sphere, setSphere] = useState(() => createSphere(FREQUENCY_CHOICES[frequencyChoice], gravity, useCurves))

    useEffect(() => {
        setFrozen(false)
        setSphere(createSphere(FREQUENCY_CHOICES[frequencyChoice], gravity, useCurves))
    }, [gravity, frequencyChoice, useCurves])

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
                    <Button onClick={() => saveCSVZip(getFabricOutput(sphere, false))}><FaDownload/></Button>
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
                    <Button color={gravity === 2 ? "success" : "secondary"}
                            onClick={() => setGravity(2)}>Heavy Gravity</Button>
                    <Button color={gravity === 1 ? "success" : "secondary"}
                            onClick={() => setGravity(1)}>Light Gravity</Button>
                    <Button color={gravity === 0 ? "success" : "secondary"}
                            onClick={() => setGravity(0)}>Space</Button>
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
                <RecoilBridge>
                    {!sphere ? <h1>No Sphere</h1> : <SphereScene sphere={sphere}/>}
                </RecoilBridge>
            </Canvas>
        </div>
    )
}

function SphereScene({sphere}: { sphere: Tensegrity }): JSX.Element {
    const [target, setTarget] = useState(new Vector3())
    const [frozen] = useRecoilState(frozenAtom)

    useFrame(state => {
        const {camera, clock} = state
        if (clock.elapsedTime < 0.01) {
            camera.position.set(0, SPHERE_RADIUS, SPHERE_RADIUS * 3.6)
        }
        if (!frozen) {
            sphere.iterate()
            const toMidpoint = new Vector3().subVectors(sphere.instance.midpoint, target).multiplyScalar(0.1)
            setTarget(new Vector3().copy(target).add(toMidpoint))
        }
    })
    return (
        <group>
            <OrbitControls target={target} maxDistance={200}/>
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
                <Stars radius={300}/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)

function PolygonView({sphere}: { sphere: Tensegrity }): JSX.Element {
    const [showPush] = useRecoilState(showPushAtom)
    const [showPull] = useRecoilState(showPullAtom)
    const instance = sphere.instance
    return (
        <group>
            {!showPull ? undefined : sphere.intervals.filter(({role}) => !role.push).map(interval => {
                const rotation = intervalRotation(instance.unitVector(interval.index))
                const length = instance.jointDistance(interval.alpha, interval.omega)
                const intervalScale = new Vector3(PULL_RADIUS, length, PULL_RADIUS)
                return (
                    <mesh
                        key={`T${interval.index}`}
                        geometry={CYLINDER}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={PULL_MATERIAL}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}
            {!showPush ? undefined : sphere.intervals.filter(({role}) => role.push).map(interval => {
                const rotation = intervalRotation(instance.unitVector(interval.index))
                const length = instance.jointDistance(interval.alpha, interval.omega)
                const intervalScale = new Vector3(PUSH_RADIUS, length, PUSH_RADIUS)
                return (
                    <mesh
                        key={`C${interval.index}`}
                        geometry={CYLINDER}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={PUSH_MATERIAL}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}
        </group>
    )
}
