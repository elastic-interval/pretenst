/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls, Stars } from "@react-three/drei"
import { Stage } from "eig"
import * as React from "react"
import { useState } from "react"
import { useFrame } from "react-three-fiber"
import { useRecoilState } from "recoil"
import { Color, CylinderGeometry, Euler, Material, MeshLambertMaterial, Vector3 } from "three"

import { isPushRole } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval, IIntervalDetails, intervalRotation, intervalsAdjacent } from "../fabric/tensegrity-types"
import { rotatingAtom, ViewMode, viewModeAtom } from "../storage/recoil"
import { isIntervalClick } from "../view/events"
import { IntervalDetails } from "../view/interval-details"
import { LINE_VERTEX_COLORS, roleMaterial } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"

export function ObjectView({tensegrity, selected, setSelected, details}: {
    tensegrity: Tensegrity,
    selected: IInterval | undefined,
    setSelected: (selection: IInterval | undefined) => void,
    details: IIntervalDetails | undefined,
}): JSX.Element {
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)
    const [target, setTarget] = useState(new Vector3())
    const [rotating] = useRecoilState(rotatingAtom)
    useFrame(() => {
        if (viewMode === ViewMode.Lines) {
            const busy = tensegrity.iterate()
            if (!busy && tensegrity.stage === Stage.Pretensing) {
                tensegrity.stage = Stage.Pretenst
            }
        }
        const midpoint = selected ? tensegrity.instance.intervalLocation(selected) : tensegrity.instance.midpoint
        const toMidpoint = new Vector3().subVectors(midpoint, target).multiplyScalar(0.1)
        if (viewMode === ViewMode.Lines || toMidpoint.lengthSq() > 0.001) {
            setTarget(new Vector3().copy(target).add(toMidpoint))
        }
    })
    const instance = tensegrity.instance
    const Rendering = () => {
        switch (viewMode) {
            case ViewMode.Lines:
                return (
                    <lineSegments
                        key="lines"
                        geometry={tensegrity.instance.floatView.lineGeometry}
                        material={LINE_VERTEX_COLORS}
                        onUpdate={self => self.geometry.computeBoundingSphere()}
                    />
                )
            case ViewMode.Selecting:
                return (
                    <SelectingView
                        tensegrity={tensegrity}
                        selected={selected}
                        setSelected={setSelected}
                        details={details}
                    />
                )
            case ViewMode.Frozen:
                return (
                    <group>
                        {tensegrity.intervals.map((interval: IInterval) => {
                            const rotation = intervalRotation(instance.unitVector(interval.index))
                            const length = instance.jointDistance(interval.alpha, interval.omega)
                            const radius = cylinderRadius(interval)
                            const intervalScale = new Vector3(radius, length, radius)
                            return (
                                <mesh
                                    key={`T${interval.index}`}
                                    geometry={CYLINDER}
                                    position={instance.intervalLocation(interval)}
                                    rotation={new Euler().setFromQuaternion(rotation)}
                                    scale={intervalScale}
                                    material={roleMaterial(interval.intervalRole)}
                                    matrixWorldNeedsUpdate={true}
                                    onClick={(event) => {
                                        if (isIntervalClick(event)) {
                                            setSelected(interval)
                                            setViewMode(ViewMode.Selecting)
                                        }
                                    }}
                                />
                            )
                        })}}
                    </group>
                )
        }
    }
    return (
        <group>
            <OrbitControls onPointerMissed={undefined} autoRotate={rotating} target={target} zoomSpeed={0.5}/>
            <scene>
                <Rendering/>
                <SurfaceComponent/>
                <Stars/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function SelectingView({tensegrity, selected, setSelected, details}: {
    tensegrity: Tensegrity,
    selected: IInterval | undefined,
    setSelected: (interval?: IInterval) => void,
    details: IIntervalDetails | undefined,
}): JSX.Element {
    const instance = tensegrity.instance
    const clickInterval = (interval: IInterval) => {
        if (selected && selected.index === interval.index) {
            setSelected(undefined)
        } else {
            setSelected(interval)
        }
    }
    return (
        <group>
            {tensegrity.intervals.map((interval: IInterval) => {
                const isPush = isPushRole(interval.intervalRole)
                if (!isPush) {
                    if (selected) {
                        if (isPushRole(selected.intervalRole)) {
                            if (!intervalsAdjacent(selected, interval)) {
                                return undefined
                            }
                        } else {
                            if (selected.index !== interval.index) {
                                return undefined
                            }
                        }
                        if (!intervalsAdjacent(selected, interval)) {
                            return undefined
                        }
                    } else {
                        return undefined
                    }
                }
                const rotation = intervalRotation(instance.unitVector(interval.index))
                const length = instance.jointDistance(interval.alpha, interval.omega)
                const radius = cylinderRadius(interval)
                const intervalScale = new Vector3(radius, length, radius)
                return (
                    <mesh
                        key={`T${interval.index}`}
                        geometry={CYLINDER}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={selected && selected.index === interval.index ? SELECTED_MATERIAL : roleMaterial(interval.intervalRole)}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={event => {
                            event.stopPropagation()
                            if (isIntervalClick(event)) {
                                clickInterval(interval)
                            }
                        }}
                    />
                )
            })}}
            {!selected || !details ? undefined : (
                <IntervalDetails instance={tensegrity.instance}
                                 interval={selected} details={details}/>
            )}
        </group>
    )
}

function material(colorString: string): Material {
    const color = new Color(colorString)
    return new MeshLambertMaterial({color})
}

const SELECTED_MATERIAL = material("#ffdd00")

function cylinderRadius(interval: IInterval): number {
    return 8 * (isPushRole(interval.intervalRole) ? 0.003 : 0.0015)
}

const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)

