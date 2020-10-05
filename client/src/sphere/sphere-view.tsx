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
import { Color, CylinderGeometry, Euler, PerspectiveCamera, Quaternion, Vector3 } from "three"

import { IntervalRole, PULL_RADIUS, PUSH_RADIUS, switchToVersion, UP, Version } from "../fabric/eig-util"
import { jointDistance } from "../fabric/tensegrity-types"
import { saveJSONZip } from "../storage/download"
import { LINE_VERTEX_COLORS, roleMaterial } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"

import { IPull, IPush, TensegritySphere } from "./tensegrity-sphere"

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
        <div id="view-container" style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
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
                    <Button onClick={() => saveJSONZip(sphere.fabricOutput)}><FaDownload/></Button>
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
            <OrbitControls/>
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
                        material={roleMaterial(IntervalRole.PhiTriangle)}
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
                        material={roleMaterial(IntervalRole.RootPush)}
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

