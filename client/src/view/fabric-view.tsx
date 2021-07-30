/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei"
import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useFrame } from "react-three-fiber"
import { useRecoilState } from "recoil"
import {
    Color,
    CylinderGeometry,
    Euler,
    Material,
    MeshLambertMaterial,
    PerspectiveCamera as Cam,
    Vector3,
} from "three"

import { isPushRole } from "../fabric/eig-util"
import { RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval, IIntervalDetails, intervalRotation, intervalsAdjacent } from "../fabric/tensegrity-types"
import { FEATURE_VALUES, rotatingAtom, ViewMode, viewModeAtom, visibleRolesAtom } from "../storage/recoil"

import { isIntervalClick } from "./events"
import { IntervalDetails } from "./interval-details"
import { LINE_VERTEX_COLORS, roleMaterial } from "./materials"
import { SurfaceComponent } from "./surface-component"

const RADIUS_FACTOR = 0.01
const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)
const AMBIENT_COLOR = new Color("#ffffff")
const TOWARDS_TARGET = 0.01
const TOWARDS_POSITION = 0.01

export function FabricView({tensegrity, runTenscript, selected, setSelected, details, selectDetails}: {
    tensegrity: Tensegrity,
    runTenscript: RunTenscript,
    selected: IInterval | undefined,
    setSelected: (selection: IInterval | undefined) => void,
    details: IIntervalDetails[],
    selectDetails: (detais: IIntervalDetails) => void,
}): JSX.Element {

    const [visibleRoles] = useRecoilState(visibleRolesAtom)
    const [visualStrainPercent] = useRecoilState(FEATURE_VALUES[WorldFeature.VisualStrain].percentAtom)
    const visualStrain = () => FEATURE_VALUES[WorldFeature.VisualStrain].mapping.percentToValue(visualStrainPercent)
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)
    const [rotating] = useRecoilState(rotatingAtom)

    const [bullseye, updateBullseye] = useState(new Vector3(0, 1, 0))
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())

    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])

    useEffect(() => {
        const current = camera.current
        if (!current || !tensegrity) {
            return
        }
        current.position.set(0, 5, tensegrity.instance.view.radius() * 5)
    }, [])

    useFrame(() => {
        const current = camera.current
        if (!current || !tensegrity) {
            return
        }
        if (viewMode === ViewMode.Lines) {
            const busy = tensegrity.iterate()
            const view = tensegrity.instance.view
            const target = selected ? tensegrity.instance.intervalLocation(selected) :
                new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
            updateBullseye(new Vector3().subVectors(target, bullseye).multiplyScalar(TOWARDS_TARGET).add(bullseye))
            const eye = current.position
            if (stage === Stage.Growing) {
                eye.y += (target.y - eye.y) * TOWARDS_POSITION
                const distanceChange = eye.distanceTo(target) - view.radius() * 2.5
                const towardsDistance = new Vector3().subVectors(target, eye).normalize().multiplyScalar(distanceChange * TOWARDS_POSITION)
                eye.add(towardsDistance)
            } else {
                if (eye.y < 0) {
                    eye.y -= eye.y * TOWARDS_POSITION * 20
                }
            }
            if (busy) {
                return
            }
            if (stage === Stage.Pretensing) {
                tensegrity.stage = Stage.Pretenst
            }
        }
    })

    const camera = useRef<Cam>()
    const pushOverPull = tensegrity.instance.world.get_float_value(WorldFeature.PushOverPull)
    const clickInterval = (interval: IInterval) => {
        if (selected && selected.index === interval.index) {
            setSelected(undefined)
        } else {
            setSelected(interval)
        }
        setViewMode(ViewMode.Selecting)
    }
    return (
        <group>
            <PerspectiveCamera ref={camera} makeDefault={true} onPointerMissed={undefined}/>
            <OrbitControls target={bullseye} autoRotate={rotating} enableKeys={false} enablePan={false}
                           enableDamping={false} minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.8}
                           onPointerMissed={undefined} zoomSpeed={0.5}
            />
            <scene>
                {viewMode === ViewMode.Selecting ? (
                    <SelectingView
                        tensegrity={tensegrity} details={details} selectDetails={selectDetails}
                        selected={selected} setSelected={setSelected}/>
                ) : viewMode === ViewMode.Frozen ? (
                    <group>
                        {tensegrity.intervals
                            .filter(interval => visibleRoles.some(role => role === interval.intervalRole))
                            .map(interval => (
                                <IntervalMesh
                                    key={`I${interval.index}`}
                                    pushOverPull={pushOverPull}
                                    visualStrain={visualStrain()}
                                    tensegrity={tensegrity}
                                    interval={interval}
                                    selected={false}
                                    onPointerDown={event => {
                                        event.stopPropagation()
                                        if (isIntervalClick(event)) {
                                            clickInterval(interval)
                                        }
                                    }}
                                />
                            ))}
                        }
                    </group>
                ) : (
                    <lineSegments
                        geometry={tensegrity.instance.floatView.lineGeometry}
                        material={LINE_VERTEX_COLORS}
                        onUpdate={self => self.geometry.computeBoundingSphere()}
                    />
                )}
                <SurfaceComponent/>
                <Stars/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function IntervalMesh({pushOverPull, visualStrain, tensegrity, interval, selected, onPointerDown}: {
    pushOverPull: number,
    visualStrain: number,
    tensegrity: Tensegrity,
    interval: IInterval,
    selected: boolean,
    onPointerDown?: (e: React.MouseEvent<Element, MouseEvent>) => void,
}): JSX.Element | null {
    const intervalMaterial = selected ? SELECTED_MATERIAL : roleMaterial(interval.intervalRole)
    const push = isPushRole(interval.intervalRole)
    const instance = tensegrity.instance
    const stiffness = instance.floatView.stiffnesses[interval.index] * (push ? pushOverPull : 1.0)
    const radius = RADIUS_FACTOR * Math.sqrt(stiffness) * (selected ? 1.5 : 1)
    const rotation = intervalRotation(instance.unitVector(interval.index))
    const strain = instance.floatView.strains[interval.index]
    const idealLength = instance.floatView.idealLengths[interval.index]
    const length = strain === 0 ? instance.intervalLength(interval) : idealLength + strain * idealLength * (1 - visualStrain)
    const intervalScale = new Vector3(radius, (length < 0) ? 0.01 : length, radius)
    return (
        <mesh
            geometry={CYLINDER}
            position={instance.intervalLocation(interval)}
            rotation={new Euler().setFromQuaternion(rotation)}
            scale={intervalScale}
            material={intervalMaterial}
            matrixWorldNeedsUpdate={true}
            onPointerDown={onPointerDown}
        />
    )
}

const BASE_RADIUS = 8
const PUSH_RADIUS = 0.004 * BASE_RADIUS
const PULL_RADIUS = 0.002 * BASE_RADIUS

function material(colorString: string): Material {
    const color = new Color(colorString)
    return new MeshLambertMaterial({color})
}

const SELECTED_MATERIAL = material("#ffdd00")
const PUSH_MATERIAL = material("#384780")
const PULL_MATERIAL = material("#a80000")

function SelectingView({tensegrity, selected, setSelected, details, selectDetails}: {
    tensegrity: Tensegrity,
    selected: IInterval | undefined,
    setSelected: (interval?: IInterval) => void,
    details: IIntervalDetails[],
    selectDetails: (details: IIntervalDetails) => void,
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
                const radius = (isPush ? PUSH_RADIUS : PULL_RADIUS) * (selected && selected.index === interval.index ? 2 : 1)
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
                        onPointerDown={event => {
                            event.stopPropagation()
                            if (isIntervalClick(event)) {
                                clickInterval(interval)
                            }
                        }}
                    />
                )
            })}}
            {details.map(d => (
                <IntervalDetails key={`deets-${d.interval.index}`} instance={tensegrity.instance}
                                 details={d} singleDetails={details.length === 1} selectDetails={selectDetails}/>
            ))}
        </group>
    )
}
