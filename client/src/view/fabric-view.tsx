/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei"
import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useFrame, useThree } from "react-three-fiber"
import { useRecoilState } from "recoil"
import {
    BufferGeometry,
    Color,
    CylinderGeometry,
    Euler,
    FrontSide,
    Object3D,
    PerspectiveCamera as Cam,
    Quaternion,
    Vector3,
} from "three"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { doNotClick, GlobalMode, isPushRole, reloadGlobalMode, UP } from "../fabric/eig-util"
import { RunTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import {
    addIntervalStats,
    FaceSelection,
    IFace,
    IInterval,
    IJoint,
    intervalLength,
    intervalLocation,
    ISelection,
    jointLocation,
    locationFromFaces,
    locationFromJoints,
} from "../fabric/tensegrity-types"
import {
    bootstrapIndexAtom,
    endDemoAtom,
    FEATURE_VALUES,
    globalModeAtom,
    rotatingAtom,
    startDemoAtom,
    ViewMode,
    viewModeAtom,
    visibleRolesAtom,
} from "../storage/recoil"

import { IntervalStatsLive, IntervalStatsSnapshot } from "./interval-stats"
import { LINE_VERTEX_COLORS, roleMaterial, SELECTED_MATERIAL } from "./materials"
import { SurfaceComponent } from "./surface-component"

const RADIUS_FACTOR = 0.01
const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)
const AMBIENT_COLOR = new Color("#ffffff")
const TOWARDS_TARGET = 0.01
const TOWARDS_POSITION = 0.01

export function FabricView({tensegrity, runTenscript, selection, setSelection}: {
    tensegrity: Tensegrity,
    runTenscript: RunTenscript,
    selection: ISelection,
    setSelection: (selection: ISelection) => void,
}): JSX.Element {

    const [visibleRoles] = useRecoilState(visibleRolesAtom)
    const [pushOverPullPercent] = useRecoilState(FEATURE_VALUES[WorldFeature.PushOverPull].percentAtom)
    const pushOverPull = () => FEATURE_VALUES[WorldFeature.PushOverPull].mapping.percentToValue(pushOverPullPercent)
    const [visualStrainPercent] = useRecoilState(FEATURE_VALUES[WorldFeature.VisualStrain].percentAtom)
    const visualStrain = () => FEATURE_VALUES[WorldFeature.VisualStrain].mapping.percentToValue(visualStrainPercent)
    const [shapingPretenstFactorPercent] = useRecoilState(FEATURE_VALUES[WorldFeature.ShapingPretenstFactor].percentAtom)
    const shapingPretenstFactor = () => FEATURE_VALUES[WorldFeature.ShapingPretenstFactor].mapping.percentToValue(shapingPretenstFactorPercent)
    const [pretenstFactorPercent] = useRecoilState(FEATURE_VALUES[WorldFeature.PretenstFactor].percentAtom)
    const pretenstFactor = () => FEATURE_VALUES[WorldFeature.PretenstFactor].mapping.percentToValue(pretenstFactorPercent)
    const [globalMode] = useRecoilState(globalModeAtom)
    const [startDemo, setStartDemo] = useRecoilState(startDemoAtom)
    const [endDemo, setEndDemo] = useRecoilState(endDemoAtom)
    const [bootstrapIndex, setBootstrapIndex] = useRecoilState(bootstrapIndexAtom)
    const [viewMode] = useRecoilState(viewModeAtom)
    const [rotating, setRotating] = useRecoilState(rotatingAtom)

    const [nonBusyCount, updateNonBusyCount] = useState(0)
    const [bullseye, updateBullseye] = useState(new Vector3(0, 1, 0))
    const [pretenst, updatePretenst] = useState(0)
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())

    useEffect(() => {
        updatePretenst(stage < Stage.Pretenst ? shapingPretenstFactor() : pretenstFactor())
    }, [stage])

    useEffect(() => {
        setBootstrapIndex(0)
        updateNonBusyCount(0)
    }, [globalMode])

    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])

    useEffect(() => {
        const current = camera.current
        if (!current || !tensegrity) {
            return
        }
        current.position.set(0, 1, tensegrity.instance.view.radius() * 2)
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

    const emergency = (message: string) => console.error("tensegrity view", message)

    useFrame(() => {
        const current = camera.current
        if (!current || !tensegrity) {
            return
        }
        if (startDemo) {
            reloadGlobalMode(GlobalMode.Demo)
            runTenscript(BOOTSTRAP[0], emergency)
            setStartDemo(false)
            return
        }
        if (endDemo) {
            reloadGlobalMode(GlobalMode.Design)
            setEndDemo(false)
            return
        }
        const view = tensegrity.instance.view
        const target =
            selection.faces.length > 0 ? locationFromFaces(selection.faces) :
                selection.joints.length > 0 ? locationFromJoints(selection.joints) :
                    new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        updateBullseye(new Vector3().subVectors(target, bullseye).multiplyScalar(TOWARDS_TARGET).add(bullseye))
        const eye = current.position
        if (globalMode === GlobalMode.Demo || stage === Stage.Growing) {
            eye.y += (target.y - eye.y) * TOWARDS_POSITION
            const distanceChange = eye.distanceTo(target) - view.radius() * 2.5
            const towardsDistance = new Vector3().subVectors(target, eye).normalize().multiplyScalar(distanceChange * TOWARDS_POSITION)
            eye.add(towardsDistance)
        } else {
            if (eye.y < 0) {
                eye.y -= eye.y * TOWARDS_POSITION * 20
            }
        }
        if (viewMode !== ViewMode.Frozen) {
            const busy = tensegrity.iterate()
            if (busy) {
                return
            }
            if (globalMode === GlobalMode.Demo) {
                switch (stage) {
                    case Stage.Shaping:
                        if (nonBusyCount === 200) {
                            tensegrity.stage = Stage.Slack
                            updateNonBusyCount(0)
                        } else {
                            updateNonBusyCount(nonBusyCount + 1)
                        }
                        break
                    case Stage.Slack:
                        if (nonBusyCount === 30) {
                            tensegrity.stage = Stage.Pretensing
                            setRotating(false)
                            updateNonBusyCount(0)
                        } else {
                            updateNonBusyCount(nonBusyCount + 1)
                        }
                        break
                    case Stage.Pretenst:
                        if (nonBusyCount === 200) {
                            const nextIndex = bootstrapIndex + 1
                            if (nextIndex === BOOTSTRAP.length) {
                                setBootstrapIndex(0)
                                reloadGlobalMode(GlobalMode.Design)
                                setRotating(false)
                                runTenscript(BOOTSTRAP[0], emergency)
                            } else {
                                setBootstrapIndex(nextIndex)
                                setRotating(true)
                                updateNonBusyCount(0)
                                runTenscript(BOOTSTRAP[nextIndex], emergency)
                            }
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
            addIntervalStats(interval, pushOverPull(), pretenst)
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
            <PerspectiveCamera ref={camera} makeDefault={true} onPointerMissed={undefined}/>
            <OrbitControls target={bullseye} autoRotate={rotating} enableKeys={false} enablePan={false}
                           enableDamping={false} minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.8}
                           onPointerMissed={undefined}
            />
            <scene>
                {viewMode === ViewMode.Frozen ? (
                    <group>
                        {tensegrity.intervals
                            .filter(interval => visibleRoles.some(role => role === interval.intervalRole))
                            .map(interval => (
                                <IntervalMesh
                                    key={`I${interval.index}`}
                                    pushOverPull={pushOverPull()}
                                    visualStrain={visualStrain()}
                                    pretenstFactor={pretenst}
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
                            onUpdate={self => self.geometry.computeBoundingSphere()}
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
                        pushOverPull={pushOverPull()}
                        visualStrain={visualStrain()}
                        pretenstFactor={pretenst}
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
                                           pushOverPull={pushOverPull()} pretenst={pretenst}/>)
                }
                {selection.faces.length === 0 ? undefined :
                    <mesh geometry={faceGeometry(selection.faces)} material={SELECTED_MATERIAL}/>}
                <SurfaceComponent/>
                <Stars/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function faceGeometry(faces: IFace[]): BufferGeometry {
    const g = new BufferGeometry()
    const count = faces.length * 3 * 3
    const positions = new Float32Array(count)
    faces.forEach((face, faceIndex) => {
        const faceOffset = faceIndex * 3
        face.ends.map(jointLocation).forEach((end, endIndex) => {
            const endOffset = faceOffset + endIndex * 3
            positions[endOffset] = end.x
            positions[endOffset + 1] = end.y
            positions[endOffset + 2] = end.z
        })
    })
    return g
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
    const push = isPushRole(interval.intervalRole)
    const stiffness = tensegrity.instance.floatView.stiffnesses[interval.index] * (push ? pushOverPull : 1.0)
    const radius = RADIUS_FACTOR * Math.sqrt(stiffness) * (selected ? 1.5 : 1)
    const unit = tensegrity.instance.unitVector(interval.index)
    const rotation = new Quaternion().setFromUnitVectors(UP, unit)
    const strain = tensegrity.instance.floatView.strains[interval.index]
    const pretenstAdjustment = 1 + (push ? pretenstFactor : 0)
    const idealLength = tensegrity.instance.floatView.idealLengths[interval.index] * pretenstAdjustment
    const length = strain === 0 ? intervalLength(interval) : idealLength + strain * idealLength * (1 - visualStrain)
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

// todo: export function isIntervalVisible(interval: IInterval, storedState: IStoredState): boolean {
//     if (storedState.visibleRoles.find(r => r === interval.intervalRole) === undefined) {
//         return false
//     }
//     const strainNuance = intervalStrainNuance(interval)
//     if (isPushRole(interval.intervalRole)) {
//         return strainNuance >= storedState.pushBottom && strainNuance <= storedState.pushTop
//     } else {
//         return strainNuance >= storedState.pullBottom && strainNuance <= storedState.pullTop
//     }
// }
//
