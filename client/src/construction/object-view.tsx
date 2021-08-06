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
import { Color, Euler, Vector3 } from "three"

import { isPushRole } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { areAdjacent, IInterval, IIntervalDetails, intervalRotation } from "../fabric/tensegrity-types"
import { Twist } from "../fabric/twist"
import { rotatingAtom, ViewMode, viewModeAtom } from "../storage/recoil"
import { isIntervalBuilt, isIntervalSelect } from "../view/events"
import { IntervalDetails } from "../view/interval-details"
import { CYLINDER_GEOMETRY, cylinderRadius, LINE_VERTEX_COLORS, roleMaterial } from "../view/materials"
import { SurfaceComponent } from "../view/surface-component"

export function ObjectView({tensegrity, selected, setSelected, builtSoFar, setBuiltSoFar, details, clickDetails}: {
    tensegrity: Tensegrity,
    selected: Twist | undefined,
    setSelected: (selection: Twist | undefined) => void,
    builtSoFar: boolean[],
    setBuiltSoFar: (jointsBuilt: boolean[]) => void,
    details: IIntervalDetails[],
    clickDetails: (details: IIntervalDetails) => void,
}): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [target, setTarget] = useState(new Vector3())
    const [rotating] = useRecoilState(rotatingAtom)
    useFrame(() => {
        if (viewMode === ViewMode.Time) {
            const busy = tensegrity.iterate()
            if (!busy && tensegrity.stage === Stage.Pretensing) {
                tensegrity.stage = Stage.Pretenst
            }
        }
        const midpoint = selected ? tensegrity.instance.twistLocation(selected) : tensegrity.instance.midpoint
        const toMidpoint = new Vector3().subVectors(midpoint, target).multiplyScalar(0.1)
        if (viewMode === ViewMode.Time || toMidpoint.lengthSq() > 0.001) {
            setTarget(new Vector3().copy(target).add(toMidpoint))
        }
    })
    const instance = tensegrity.instance
    const Rendering = () => {
        switch (viewMode) {
            case ViewMode.Time:
                return (
                    <lineSegments
                        key="lines"
                        geometry={tensegrity.instance.floatView.lineGeometry}
                        material={LINE_VERTEX_COLORS}
                        onUpdate={self => self.geometry.computeBoundingSphere()}
                    />
                )
            case ViewMode.Select:
                return (
                    <SelectingView
                        tensegrity={tensegrity}
                        selected={selected}
                        setSelected={setSelected}
                        details={details}
                        clickDetails={clickDetails}
                        viewMode={viewMode}
                    />
                )
            case ViewMode.Look:
                return (
                    <group>
                        {tensegrity.intervals.map((interval: IInterval) => {
                            const {alpha, omega, intervalRole} = interval
                            const rotation = intervalRotation(instance.unitVector(interval.index))
                            const length = instance.jointDistance(alpha, omega)
                            const radius = cylinderRadius(interval, viewMode)
                            const intervalScale = new Vector3(radius, length, radius)
                            const built = builtSoFar.length === 0 ? true : builtSoFar[alpha.index] || builtSoFar[omega.index]
                            return (
                                <mesh
                                    key={`T${interval.index}`}
                                    geometry={CYLINDER_GEOMETRY}
                                    position={instance.intervalLocation(interval)}
                                    rotation={new Euler().setFromQuaternion(rotation)}
                                    scale={intervalScale}
                                    material={roleMaterial(intervalRole, !built)}
                                    matrixWorldNeedsUpdate={true}
                                    onClick={(event) => {
                                        if (!isPushRole(intervalRole)) {
                                            return
                                        }
                                        if (isIntervalSelect(event)) {
                                            setSelected(tensegrity.findTwist(interval))
                                        }
                                        if (isIntervalBuilt(event)) {
                                            const builtNow = [...builtSoFar]
                                            const currentlyBuilt = builtNow[alpha.index] || builtNow[omega.index]
                                            builtNow[alpha.index] = builtNow[omega.index] = !currentlyBuilt
                                            setBuiltSoFar(builtNow)
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

function SelectingView({tensegrity, selected, setSelected, details, clickDetails, viewMode}: {
    tensegrity: Tensegrity,
    selected: Twist | undefined,
    setSelected: (twist?: Twist) => void,
    details: IIntervalDetails[],
    clickDetails: (details: IIntervalDetails) => void,
    viewMode: ViewMode,
}): JSX.Element {
    const instance = tensegrity.instance
    return (
        <group>
            {tensegrity.intervals.map((interval: IInterval) => {
                const isPush = isPushRole(interval.intervalRole)
                if (!isPush) {
                    if (selected) {
                        const adjacent = selected.pushes.find(push => areAdjacent(push, interval))
                        if (!adjacent) {
                            return undefined
                        }
                    } else {
                        return undefined
                    }
                }
                const rotation = intervalRotation(instance.unitVector(interval.index))
                const length = instance.jointDistance(interval.alpha, interval.omega)
                const radius = cylinderRadius(interval, viewMode)
                const intervalScale = new Vector3(radius, length, radius)
                return (
                    <mesh
                        key={`T${interval.index}`}
                        geometry={CYLINDER_GEOMETRY}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={roleMaterial(interval.intervalRole)}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={event => {
                            event.stopPropagation()
                            if (isIntervalSelect(event) && isPushRole(interval.intervalRole)) {
                                setSelected(tensegrity.findTwist(interval))
                            }
                        }}
                    />
                )
            })}}
            {details.map(d => (
                <IntervalDetails key={`deets-${d.interval.index}`} instance={tensegrity.instance}
                                 details={d} singleDetails={details.length === 1} onClick={clickDetails}
                />
            ))}
        </group>
    )
}
