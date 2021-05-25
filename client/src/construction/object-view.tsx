/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls, Stars } from "@react-three/drei"
import { LINE_VERTEX_COLORS } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"
import { Color, CylinderGeometry, Euler, Material, MeshLambertMaterial, Quaternion, Vector3 } from "three"
import * as React from "react"
import { useState } from "react"
import { isPushRole, UP } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval, ISelection } from "../fabric/tensegrity-types"
import { useFrame } from "react-three-fiber"
import { useRecoilState } from "recoil"
import { ViewMode, viewModeAtom } from "../storage/recoil"

export function ObjectView({tensegrity, selection, setSelection}: {
    tensegrity: Tensegrity,
    selection: ISelection,
    setSelection: (selection: ISelection) => void,
}): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [tick, setTick] = useState(0)
    const [target, setTarget] = useState(new Vector3())
    useFrame(() => {
        if (viewMode === ViewMode.Lines) {
            const busy = tensegrity.iterate()
            if (!busy) {
                console.log("not busy")
            }
        }
        const toMidpoint = new Vector3().subVectors(tensegrity.instance.midpoint, target).multiplyScalar(0.1)
        setTarget(new Vector3().copy(target).add(toMidpoint))
        setTick(tick + 1)
    })
    return (
        <group>
            <OrbitControls onPointerMissed={undefined} target={target}/>
            <scene>
                {viewMode === ViewMode.Frozen ? (
                    <PolygonView tensegrity={tensegrity}/>
                ) : (
                    <lineSegments
                        key="lines"
                        geometry={tensegrity.instance.floatView.lineGeometry}
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

function material(colorString: string): Material {
    const color = new Color(colorString)
    return new MeshLambertMaterial({color})
}

const PUSH_MATERIAL = material("#011884")
const PULL_MATERIAL = material("#a80000")

const BASE_RADIUS = 15
const PUSH_RADIUS = 0.004 * BASE_RADIUS
const PULL_RADIUS = 0.002 * BASE_RADIUS
const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)

function PolygonView({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const instance = tensegrity.instance
    return (
        <group>
            {tensegrity.intervals.map((interval: IInterval) => {
                const isPush = isPushRole(interval.intervalRole)
                const unit = instance.unitVector(interval.index)
                const rotation = new Quaternion().setFromUnitVectors(UP, unit)
                const length = instance.jointDistance(interval.alpha, interval.omega)
                const radius = isPush ? PUSH_RADIUS : PULL_RADIUS
                const intervalScale = new Vector3(radius, length, radius)
                return (
                    <mesh
                        key={`T${interval.index}`}
                        geometry={CYLINDER}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={isPush ? PUSH_MATERIAL : PULL_MATERIAL}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}}
        </group>
    )
}
