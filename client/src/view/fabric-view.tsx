/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

// export { ExtrudeGeometry, ExtrudeGeometryOptions } from './ExtrudeGeometry';
// client/node_modules/three/src/geometries/Geometries.d.ts

import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei"
import { Text } from "@react-three/drei/Text"
import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useFrame, useThree } from "react-three-fiber"
import { BehaviorSubject } from "rxjs"
import {
    Color,
    CylinderGeometry,
    Euler,
    Face3,
    FrontSide,
    Geometry,
    Mesh,
    Object3D,
    PerspectiveCamera as Cam,
    Quaternion,
    Vector3,
} from "three"

import { doNotClick, isPushRole, UP } from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import {
    addIntervalStats,
    FaceSelection,
    IFace,
    IInterval,
    IJoint,
    intervalLocation,
    ISelection,
    jointLocation,
    locationFromFaces,
    locationFromJoints,
} from "../fabric/tensegrity-types"
import { isIntervalVisible, IStoredState, transition, ViewMode } from "../storage/stored-state"

import { IntervalStatsLive, IntervalStatsSnapshot } from "./interval-stats"
import { LINE_VERTEX_COLORS, roleMaterial, SELECTED_MATERIAL } from "./materials"
import { SurfaceComponent } from "./surface-component"

const RADIUS_FACTOR = 0.01
const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)
const AMBIENT_COLOR = new Color("#ffffff")
const TOWARDS_TARGET = 0.01
const TOWARDS_POSITION = 0.01

export function FabricView({worldFeatures, tensegrity, selection, setSelection, storedState$, viewMode}: {
    worldFeatures: Record<WorldFeature, FloatFeature>,
    tensegrity: Tensegrity,
    selection: ISelection,
    setSelection: (selection: ISelection) => void,
    viewMode: ViewMode,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {
    const pushOverPull = worldFeatures[WorldFeature.PushOverPull]
    const visualStrain = worldFeatures[WorldFeature.VisualStrain]
    const [pretenstFactor, updatePretenstFactor] = useState(0)
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    const [instance, updateInstance] = useState(tensegrity.instance)
    useEffect(() => {
        updatePretenstFactor(stage < Stage.Pretenst ?
            worldFeatures[WorldFeature.ShapingPretenstFactor].numeric :
            worldFeatures[WorldFeature.PretenstFactor].numeric)
    }, [stage])
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        updateInstance(tensegrity.instance)
        return () => sub.unsubscribe()
    }, [tensegrity])

    const [storedState, updateStoredState] = useState(storedState$.getValue())
    useEffect(() => {
        const current = camera.current
        if (!current) {
            return
        }
        const sub = storedState$.subscribe(newState => updateStoredState(newState))
        current.position.set(0, 1, instance.view.radius() * 2)
        return () => sub.unsubscribe()
    }, [])

    function setSelectedFaces(faces: IFace[]): void {
        const intervalRec = faces.reduce((rec: Record<number, IInterval>, face) => {
            const add = (i: IInterval) => rec[i.index] = i
            switch (face.faceSelection) {
                case FaceSelection.Pulls:
                    face.pulls.forEach(add)
                    break
                case FaceSelection.Pushes:
                    face.pushes.forEach(add)
                    break
                case FaceSelection.Both:
                    face.pulls.forEach(add)
                    face.pushes.forEach(add)
                    break
            }
            return rec
        }, {})
        const jointRec = faces.reduce((rec: Record<number, IJoint>, face) => {
            face.ends.forEach(end => rec[end.index] = end)
            return rec
        }, {})
        const intervals = Object.keys(intervalRec).map(k => intervalRec[k])
        const joints = Object.keys(jointRec).map(k => jointRec[k])
        setSelection({faces, intervals, joints})
    }

    const [bullseye, updateBullseye] = useState(new Vector3(0, 1, 0))
    const [nonBusyCount, updateNonBusyCount] = useState(0)
    useFrame(() => {
        const current = camera.current
        if (!current) {
            return
        }
        const view = instance.view
        const target =
            selection.faces.length > 0 ? locationFromFaces(selection.faces) :
                selection.joints.length > 0 ? locationFromJoints(selection.joints) :
                    new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        updateBullseye(new Vector3().subVectors(target, bullseye).multiplyScalar(TOWARDS_TARGET).add(bullseye))
        if (storedState.demoCount >= 0) {
            const eye = current.position
            eye.y += (target.y - eye.y) * TOWARDS_POSITION
            const distanceChange = eye.distanceTo(target) - view.radius() * 2
            const towardsDistance = new Vector3().subVectors(target, eye).normalize().multiplyScalar(distanceChange * TOWARDS_POSITION)
            eye.add(towardsDistance)
        }
        if (viewMode !== ViewMode.Frozen) {
            const busy = tensegrity.iterate()
            if (busy) {
                return
            }
            if (storedState.demoCount >= 0) {
                switch (stage) {
                    case Stage.Shaping:
                        if (nonBusyCount === 20) {
                            tensegrity.stage = Stage.Slack
                            updateNonBusyCount(0)
                        } else {
                            updateNonBusyCount(nonBusyCount + 1)
                        }
                        break
                    case Stage.Slack:
                        if (nonBusyCount === 10) {
                            tensegrity.stage = Stage.Pretensing
                            transition(storedState$, {rotating: false})
                            updateNonBusyCount(0)
                        } else {
                            updateNonBusyCount(nonBusyCount + 1)
                        }
                        break
                    case Stage.Pretenst:
                        if (nonBusyCount === 20) {
                            transition(storedState$, {demoCount: storedState.demoCount + 1, rotating: true})
                            updateNonBusyCount(0)
                        } else {
                            updateNonBusyCount(nonBusyCount + 1)
                        }
                        break
                }
            }
            if (stage === Stage.Pretensing) {
                tensegrity.stage = Stage.Pretenst
            }
        }
    })

    function clickInterval(interval: IInterval): void {
        if (interval.stats) {
            interval.stats = undefined
        } else {
            addIntervalStats(interval, pushOverPull.numeric, pretenstFactor)
        }
    }

    function clickFace(face: IFace): void {
        switch (face.faceSelection) {
            case FaceSelection.None:
                face.faceSelection = FaceSelection.Face
                setSelectedFaces([...selection.faces, face])
                break
            case FaceSelection.Face:
                face.faceSelection = FaceSelection.Pulls
                setSelectedFaces(selection.faces)
                break
            case FaceSelection.Pulls:
                face.faceSelection = FaceSelection.Pushes
                setSelectedFaces(selection.faces)
                break
            case FaceSelection.Pushes:
                face.faceSelection = FaceSelection.Both
                setSelectedFaces(selection.faces)
                break
            case FaceSelection.Both:
                face.faceSelection = FaceSelection.None
                setSelectedFaces(selection.faces.filter(({index}) => index !== face.index))
                break
        }
    }

    const camera = useRef<Cam>()
    return (
        <group>
            <PerspectiveCamera ref={camera} makeDefault={true}/>
            <OrbitControls target={bullseye} autoRotate={storedState.rotating} enableKeys={false} enablePan={false}
                           enableDamping={false} minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.8}
            />
            <scene>
                {viewMode === ViewMode.Frozen ? (
                    <group>
                        {tensegrity.intervals
                            .filter(interval => isIntervalVisible(interval, storedState))
                            .map(interval => (
                                <IntervalMesh
                                    key={`I${interval.index}`}
                                    pushOverPull={pushOverPull.numeric}
                                    visualStrain={visualStrain.numeric}
                                    pretenstFactor={pretenstFactor}
                                    tensegrity={tensegrity}
                                    interval={interval}
                                    selected={false}
                                    onPointerDown={event => {
                                        event.stopPropagation()
                                        clickInterval(interval)
                                    }}
                                />
                            ))}
                        }
                    </group>
                ) : (
                    <>
                        <lineSegments
                            geometry={tensegrity.instance.floatView.lineGeometry}
                            material={LINE_VERTEX_COLORS}
                        />
                    </>
                )}
                {viewMode !== ViewMode.Selecting ? undefined : (
                    <Faces
                        tensegrity={tensegrity}
                        stage={stage}
                        clickFace={face => clickFace(face)}
                    />
                )}
                {selection.intervals.map(interval => (
                    <IntervalMesh
                        key={`SI${interval.index}`}
                        pushOverPull={pushOverPull.numeric}
                        visualStrain={visualStrain.numeric}
                        pretenstFactor={pretenstFactor}
                        tensegrity={tensegrity}
                        interval={interval}
                        selected={true}
                        onPointerDown={event => {
                            event.stopPropagation()
                            clickInterval(interval)
                        }}
                    />
                ))}
                {viewMode === ViewMode.Frozen ?
                    tensegrity.intervalsWithStats.map(interval =>
                        <IntervalStatsSnapshot key={`S${interval.index}`} interval={interval}/>)
                    : tensegrity.intervalsWithStats.map(interval =>
                        <IntervalStatsLive key={`SL${interval.index}`} interval={interval}
                                           pushOverPull={pushOverPull.numeric} pretenst={pretenstFactor}/>)
                }
                {selection.faces.filter(f => (f.faceSelection === FaceSelection.Face)).map(face => {
                    const geometry = new Geometry()
                    geometry.vertices = face.ends.map(jointLocation)
                    geometry.faces.push(new Face3(0, 1, 2))
                    return <mesh key={`SJ${face.index}`} geometry={geometry} material={SELECTED_MATERIAL}/>
                })}
                {viewMode === ViewMode.Frozen ? undefined : selection.joints.map(joint => {
                    const key = `${joint.index}`
                    return <Tag key={key} position={jointLocation(joint)} text={key}/>
                })}
                <SurfaceComponent/>
                <Stars/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function Tag({position, text}: {
    position: Vector3,
    text: string,
}): JSX.Element | null {
    const {camera} = useThree()
    const ref = useRef<Mesh>()
    useFrame(() => {
        if (ref.current) {
            ref.current.quaternion.copy(camera.quaternion)
        }
    })
    return <Text ref={ref} fontSize={0.1} position={position} anchorY="middle" anchorX="center">{text}</Text>
}

function IntervalMesh({pushOverPull, visualStrain, pretenstFactor, tensegrity, interval, selected, onPointerDown}: {
    pushOverPull: number,
    visualStrain: number,
    pretenstFactor: number
    tensegrity: Tensegrity,
    interval: IInterval,
    selected: boolean,
    onPointerDown?: (e: React.MouseEvent<Element, MouseEvent>) => void,
}): JSX.Element | null {
    const material = selected ? SELECTED_MATERIAL : roleMaterial(interval.intervalRole)
    const stiffness = tensegrity.instance.floatView.stiffnesses[interval.index]
        * (isPushRole(interval.intervalRole) ? pushOverPull : 1.0)
    const radius = RADIUS_FACTOR * Math.sqrt(stiffness) * (selected ? 1.5 : 1)
    const unit = tensegrity.instance.unitVector(interval.index)
    const rotation = new Quaternion().setFromUnitVectors(UP, unit)
    const strain = tensegrity.instance.floatView.strains[interval.index]
    const pretenstAdjustment = 1 + (isPushRole(interval.intervalRole) ? pretenstFactor : 0)
    const idealLength = tensegrity.instance.floatView.idealLengths[interval.index] * pretenstAdjustment
    const length = idealLength + strain * idealLength * (1 - visualStrain)
    const intervalScale = new Vector3(radius, (length < 0) ? 0.01 : length, radius)
    return (
        <mesh
            geometry={CYLINDER}
            position={intervalLocation(interval)}
            rotation={new Euler().setFromQuaternion(rotation)}
            scale={intervalScale}
            material={material}
            matrixWorldNeedsUpdate={true}
            onPointerDown={onPointerDown}
        />
    )
}

function Faces({tensegrity, stage, clickFace}: {
    tensegrity: Tensegrity,
    stage: Stage,
    clickFace: (face: IFace) => void,
}): JSX.Element {
    const {raycaster} = useThree()
    const meshRef = useRef<Object3D>()
    const [downEvent, setDownEvent] = useState<React.MouseEvent<Element, MouseEvent> | undefined>()
    const onPointerDown = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation()
        setDownEvent(event)
    }
    const onPointerUp = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation()
        const mesh = meshRef.current
        if (doNotClick(stage) || !downEvent || !mesh) {
            return
        }
        const dx = downEvent.clientX - event.clientX
        const dy = downEvent.clientY - event.clientY
        const distanceSq = dx * dx + dy * dy
        if (distanceSq > 36) {
            return
        }
        const intersections = raycaster.intersectObjects([mesh], true)
        const faces = intersections.map(intersection => intersection.faceIndex).map(faceIndex => {
            if (faceIndex === undefined) {
                return undefined
            }
            return tensegrity.faces[faceIndex]
        })
        const face = faces.reverse().pop()
        setDownEvent(undefined)
        if (!face) {
            return
        }
        clickFace(face)
    }
    return (
        <mesh
            key="faces" ref={meshRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
            geometry={tensegrity.instance.floatView.faceGeometry}
        >
            <meshPhongMaterial attach="material"
                               transparent={true} side={FrontSide} depthTest={false} opacity={0.2} color="white"/>
        </mesh>
    )
}

