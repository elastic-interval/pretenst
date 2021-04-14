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

import { switchToVersion, UP, Version } from "../fabric/eig-util"
import { jointDistance } from "../fabric/tensegrity-types"
import { saveCSVZip } from "../storage/download"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"

import { IPull, IPush, TensegritySphere } from "./tensegrity-sphere"

export const PUSH_RADIUS = 0.01
export const PULL_RADIUS = 0.003

interface ILengthRange {
    material: Material,
    low: number
    high: number
}

function material(colorString: string): Material {
    const color = new Color(colorString)
    return new MeshLambertMaterial({color})
}

const PULL_RANGES: ILengthRange[] = [
    {material: material("#091fb1"), low: 0.11, high: 0.19},
    {material: material("#259200"), low: 0.20, high: 0.25},
    {material: material("#ffe00c"), low: 0.26, high: 0.30},
]

const PUSH_RANGES: ILengthRange[] = [
    {material: material("#dd0dec"), low: 0.40, high: 0.43},
    {material: material("#f5c30c"), low: 0.45, high: 0.5},
]

function findMaterial(length: number, choices: ILengthRange[]): Material {
    const found = choices.find(({low, high}) => length > low && length < high)
    if (!found) {
        console.log("weird length", length)
        return material("#000000")
    }
    return found.material
}

const FREQUENCIES = [1, 2, 3, 4, 5, 6, 7, 8]
const PREFIX = "#sphere-"

export function SphereView({createSphere}: { createSphere: (frequency: number) => TensegritySphere }): JSX.Element {
    const [polygons, setPolygons] = useState(false)
    const [frequency, setFrequency] = useState(() => {
        if (location.hash.startsWith(PREFIX)) {
            const freq = parseInt(location.hash.substring(PREFIX.length), 10)
            if (FREQUENCIES.find(f => f === freq)) {
                return freq
            }
        }
        return 1
    })
    const [sphere, setSphere] = useState(() => createSphere(frequency))
    useEffect(() => {
        location.hash = `sphere-${sphere.frequency}`
    }, [sphere])
    useEffect(() => {
        setSphere(createSphere(frequency))
    }, [frequency])
    return (
        <div style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <div id="bottom-middle">
                <ButtonGroup>
                    {FREQUENCIES.map(f => (
                        <Button color="info" key={`Frequency${f}`}
                                disabled={f === frequency}
                                onClick={() => setFrequency(f)}>{f}</Button>
                    ))}
                </ButtonGroup>
            </div>
            <div id="bottom-right">
                <ButtonGroup>
                    <Button onClick={() => saveCSVZip(sphere.fabricOutput)}><FaDownload/></Button>
                    <Button onClick={() => setPolygons(!polygons)}><FaCamera/></Button>
                    <Button onClick={() => switchToVersion(Version.Design)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
            <Canvas style={{backgroundColor: "black"}}>
                <Camera/>
                {!sphere ? <h1>No Sphere</h1> : <SphereScene sphere={sphere} polygons={polygons}/>}
            </Canvas>
        </div>
    )
}

export function SphereScene({sphere, polygons}: {
    sphere: TensegritySphere,
    polygons: boolean,
}): JSX.Element {
    const [tick, setTick] = useState(0)

    useFrame(() => {
        if (!polygons) {
            sphere.iterate()
        }
        // const toMidpoint = new Vector3().subVectors(sphere.instance.midpoint, control.target).multiplyScalar(0.1)
        // control.target.add(toMidpoint)
        // control.update()
        setTick(tick + 1)
    })
    return (
        <group>
            <OrbitControls onPointerMissed={undefined}/>
            <scene>
                {polygons ? (
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

function PolygonView({sphere}: {
    sphere: TensegritySphere,
}): JSX.Element {
    return (
        <group>
            {sphere.pulls.map((pull: IPull) => {
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
                        material={findMaterial(length, PULL_RANGES)}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}}
            {sphere.pushes.map((push: IPush) => {
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
                        material={findMaterial(length, PUSH_RANGES)}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}}
        </group>
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

