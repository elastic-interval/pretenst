/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { OrbitControls, PerspectiveCamera, Stars } from "react-three-drei-without-subdivision"
import { useFrame } from "react-three-fiber"
import { useRecoilState } from "recoil"
import { Color, Euler, Material, MeshLambertMaterial, PerspectiveCamera as Cam, Vector3 } from "three"

import { isPushRole } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { areAdjacent, IInterval, IIntervalDetails, intervalRotation } from "../fabric/tensegrity-types"
import { Twist } from "../fabric/twist"
import { FEATURE_VALUES, rotatingAtom, ViewMode, viewModeAtom, visibleRolesAtom } from "../storage/recoil"

import { isIntervalSelect } from "./events"
import { IntervalDetails } from "./interval-details"
import { CYLINDER_GEOMETRY, cylinderRadius, LINE_VERTEX_COLORS, roleMaterial } from "./materials"
import { SurfaceComponent } from "./surface-component"

const AMBIENT_COLOR = new Color("#ffffff")
const TOWARDS_TARGET = 0.01
const TOWARDS_POSITION = 0.01

export function FabricView({tensegrity, selected, setSelected, details, selectDetails}: {
    tensegrity: Tensegrity,
    selected: Twist | undefined,
    setSelected: (selection: Twist | undefined) => void,
    details: IIntervalDetails[],
    selectDetails: (detais: IIntervalDetails) => void,
}): JSX.Element {

    const [visibleRoles] = useRecoilState(visibleRolesAtom)
    const [visualStrainPercent] = useRecoilState(FEATURE_VALUES[WorldFeature.VisualStrain].percentAtom)
    const visualStrain = () => FEATURE_VALUES[WorldFeature.VisualStrain].mapping.percentToValue(visualStrainPercent)
    const [viewMode] = useRecoilState(viewModeAtom)
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
        if (viewMode === ViewMode.Time) {
            const busy = tensegrity.iterate()
            const view = tensegrity.instance.view
            const target = selected ? tensegrity.instance.twistLocation(selected) : tensegrity.instance.midpoint
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
    return (
        <group>
            <PerspectiveCamera ref={camera} makeDefault={true}/>
            <OrbitControls target={bullseye} autoRotate={rotating} enableKeys={false} enablePan={false}
                           enableDamping={false} minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.8}
                           zoomSpeed={0.5}
            />
            <scene>
                {viewMode === ViewMode.Select ? (
                    <SelectingView
                        tensegrity={tensegrity} details={details} selectDetails={selectDetails}
                        selected={selected} setSelected={setSelected}/>
                ) : viewMode === ViewMode.Look ? (
                    <group>
                        {tensegrity.intervals
                            .filter(interval => visibleRoles.some(role => role === interval.intervalRole))
                            .map(interval => (
                                <IntervalMesh
                                    key={`I${interval.index}`}
                                    visualStrain={visualStrain()}
                                    tensegrity={tensegrity}
                                    interval={interval}
                                    selected={false}
                                    onPointerDown={event => {
                                        event.stopPropagation()
                                        if (isIntervalSelect(event)) {
                                            // clickInterval(interval)
                                        }
                                    }}
                                    viewMode={viewMode}
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

function IntervalMesh({visualStrain, tensegrity, interval, selected, onPointerDown, viewMode}: {
    visualStrain: number,
    tensegrity: Tensegrity,
    interval: IInterval,
    selected: boolean,
    onPointerDown?: (e: React.MouseEvent<Element, MouseEvent>) => void,
    viewMode: ViewMode,
}): JSX.Element | null {
    const instance = tensegrity.instance
    const radius = cylinderRadius(interval, viewMode)
    const rotation = intervalRotation(instance.unitVector(interval.index))
    const strain = instance.floatView.strains[interval.index]
    const idealLength = instance.floatView.idealLengths[interval.index]
    const length = strain === 0 ? instance.intervalLength(interval) : idealLength + strain * idealLength * (1 - visualStrain)
    const intervalScale = new Vector3(radius, (length < 0) ? 0.01 : length, radius)
    return (
        <mesh
            geometry={CYLINDER_GEOMETRY}
            position={instance.intervalLocation(interval)}
            rotation={new Euler().setFromQuaternion(rotation)}
            scale={intervalScale}
            material={roleMaterial(interval.intervalRole)}
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

const PUSH_MATERIAL = material("#384780")
const PULL_MATERIAL = material("#a80000")

function SelectingView({tensegrity, selected, setSelected, details, selectDetails}: {
    tensegrity: Tensegrity,
    selected: Twist | undefined,
    setSelected: (twist?: Twist) => void,
    details: IIntervalDetails[],
    selectDetails: (details: IIntervalDetails) => void,
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
                const radius = isPush ? PUSH_RADIUS : PULL_RADIUS
                const intervalScale = new Vector3(radius, length, radius)
                return (
                    <mesh
                        key={`T${interval.index}`}
                        geometry={CYLINDER_GEOMETRY}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={isPush ? PUSH_MATERIAL : PULL_MATERIAL}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={event => {
                            event.stopPropagation()
                            if (isIntervalSelect(event)) {
                                setSelected(tensegrity.findTwist(interval))
                            }
                        }}
                    />
                )
            })}}
            {details.map(d => (
                <IntervalDetails key={`deets-${d.interval.index}`} instance={tensegrity.instance}
                                 details={d} singleDetails={details.length === 1} onClick={selectDetails}/>
            ))}
        </group>
    )
}
