/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRef, useState } from "react"
import { Canvas, CanvasContext, extend, ReactThreeFiber, useRender } from "react-three-fiber"
import { PerspectiveCamera, Scene } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricExports } from "./fabric/fabric-exports"
import { createFabricKernel } from "./fabric/fabric-kernel"
import { Physics } from "./fabric/physics"
import { TensegrityFabric } from "./fabric/tensegrity-fabric"
import { MAX_POPULATION } from "./gotchi/evolution"
import { TENSEGRITY_FACE, TENSEGRITY_LINE } from "./view/materials"
import { PhysicsPanel } from "./view/physics-panel"
import { SurfaceComponent } from "./view/surface-component"

extend({OrbitControls})

declare global {
    namespace JSX {
        // tslint:disable-next-line:interface-name
        interface IntrinsicElements {
            orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>
        }
    }
}

export interface ITensegrityProps {
    fabricExports: IFabricExports
}

export interface ITensegrityState {
    fabric: TensegrityFabric
}

export function Tensegrity({fabricExports}: ITensegrityProps): JSX.Element {
    const physics = new Physics()
    physics.applyGlobal(fabricExports)
    const fabricKernel = createFabricKernel(fabricExports, MAX_POPULATION, 500)
    const fabric = fabricKernel.createTensegrityFabric()
    if (!fabric) {
        throw new Error()
    }
    if (fabric) {
        fabric.applyPhysics(physics)
        fabric.createBrick()
    }
    return (
        <div className="the-whole-page">
            <TensegrityView fabric={fabric}/>
            <PhysicsPanel
                physics={physics}
                fabricExports={fabricExports}
                fabricInstanceExports={fabric.exports}
            />
        </div>
    )
}

function TensegrityView({fabric}: ITensegrityState): JSX.Element {
    return (
        <Canvas>
            <FabricView fabric={fabric}/>
        </Canvas>
    )
}

export interface IFabricState {
    fabric: TensegrityFabric
}

function FabricView({fabric}: IFabricState): JSX.Element {
    const [time, setTime] = useState<number>(0)
    const scene = useRef<Scene>()
    const camera = useRef<PerspectiveCamera>()
    const controls = useRef<OrbitControls>()
    useRender(({gl, canvas}: CanvasContext, timestamp: number) => {
        const currentControls = controls.current
        if (currentControls) {
            currentControls.update()
        }
        fabric.iterate(1)
        setTime(timestamp)
    })
    if (!time) {
        console.log("time", time)
    }
    return (
        <group>
            <perspectiveCamera
                ref={camera}
                position={[1, 3, 6]}
                onUpdate={(self: PerspectiveCamera) => self.updateProjectionMatrix()}
            />
            {camera.current && (
                <>
                    <orbitControls
                        ref={controls}
                        args={[camera.current]}
                        enableDamping={true}
                        dampingFactor={0.1}
                        rotateSpeed={0.1}/>
                    <scene ref={scene}>
                        <mesh
                            key="Triangles"
                            geometry={fabric.facesGeometry}
                            material={TENSEGRITY_FACE}
                            onPointerDown={
                                (event: React.MouseEvent<HTMLDivElement>) => {
                                    console.log("event", event)
                                }
                            }
                        />
                        <lineSegments
                            key="Lines"
                            geometry={fabric.linesGeometry}
                            material={TENSEGRITY_LINE}/>
                        <SurfaceComponent/>
                    </scene>
                </>
            )}
        </group>
    )
}
