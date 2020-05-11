/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, extend, ReactThreeFiber, useFrame, useThree, useUpdate } from "react-three-fiber"
import { Color, PerspectiveCamera } from "three"

import { LINE_VERTEX_COLORS } from "../view/materials"
import { Orbit } from "../view/orbit"
import { SurfaceComponent } from "../view/surface-component"

import { TensegritySphere } from "./tensegrity-sphere"

extend({Orbit})
declare global {
    namespace JSX {
        /* eslint-disable @typescript-eslint/interface-name-prefix */
        interface IntrinsicElements {
            orbit: ReactThreeFiber.Object3DNode<Orbit, typeof Orbit>
        }

        /* eslint-enable @typescript-eslint/interface-name-prefix */
    }
}

export function SphereView({sphere}: { sphere: TensegritySphere }): JSX.Element {

    return (
        <div id="view-container" style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <Canvas style={{backgroundColor: "black"}}>
                <Camera/>
                {!sphere ? <h1>No Sphere</h1> : <SphereScene sphere={sphere}/>}
            </Canvas>
        </div>
    )
}

export function SphereScene({sphere}: { sphere: TensegritySphere }): JSX.Element {
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    const viewContainer = document.getElementById("view-container") as HTMLElement

    const orbit = useUpdate<Orbit>(orb => {
        orb.minPolarAngle = 0
        orb.maxPolarAngle = Math.PI / 2
        orb.minDistance = 0.1
        orb.maxDistance = 1000
        orb.zoomSpeed = 0.5
        orb.enableZoom = true
        // orb.target.set(0, 5, 0)
        orb.update()
    }, [])

    const [tick, setTick] = useState(0)

    useFrame(() => {
        const control: Orbit = orbit.current
        const nextStage = sphere.iterate()
        // const midpoint = sphere.instance.midpoint
        // console.log("target", control.target)
        // console.log("midpoint", midpoint)
        // control.target.copy(midpoint)
        // console.log("target2", control.target)
        control.update()
        switch (nextStage) {
            default:
                setTick(tick + 1)
                break
        }
    })
    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                <lineSegments
                    key="lines"
                    geometry={sphere.instance.floatView.lineGeometry}
                    material={LINE_VERTEX_COLORS}
                />
                <SurfaceComponent/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
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
        camera.position.set(0, 10, 60)
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

