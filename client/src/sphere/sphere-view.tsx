/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas, extend, ReactThreeFiber, useFrame, useThree, useUpdate } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"
import { Color, PerspectiveCamera, Vector3 } from "three"

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

export function SphereView({createSphere}: { createSphere: (frequency: number) => TensegritySphere }): JSX.Element {
    const [sphere, setSphere] = useState(() => createSphere(1))
    return (
        <div id="view-container" style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <div id="bottom-middle">
                <ButtonGroup vertical={false}>
                    {[1, 2, 3, 4, 5, 6].map(frequency => (
                        <Button key={`Frequency${frequency}`} onClick={() => setSphere(createSphere(frequency))}>
                            {frequency}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>
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
        orb.minDistance = 1
        orb.maxDistance = 10000
        orb.enableZoom = true
        orb.update()
    }, [])

    const [tick, setTick] = useState(0)

    useFrame(() => {
        const control: Orbit = orbit.current
        if (tick === 0) {
            control.target.copy(sphere.location)
        }
        sphere.iterate()
        const toMidpoint = new Vector3().subVectors(sphere.instance.midpoint, control.target).multiplyScalar(0.1)
        control.target.add(toMidpoint)
        control.update()
        setTick(tick + 1)
    })
    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                <lineSegments
                    key="lines"
                    geometry={sphere.instance.floatView.lineGeometry}
                    material={LINE_VERTEX_COLORS}
                    onUpdate={self => self.geometry.computeBoundingSphere()}
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
        camera.position.set(0, 1, 5)
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

