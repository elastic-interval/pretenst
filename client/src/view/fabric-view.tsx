/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { extend, ReactThreeFiber, useFrame, useThree, useUpdate } from "react-three-fiber"
import { BehaviorSubject } from "rxjs"
import {
    BackSide,
    Color,
    CylinderGeometry,
    Euler,
    FrontSide,
    MeshPhongMaterial,
    Object3D,
    PerspectiveCamera,
    Quaternion,
    SphereGeometry,
    TextureLoader,
    Vector3,
} from "three"

import { doNotClick, isPushRole, UP } from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import {
    FaceSelection,
    IFace,
    IInterval,
    intervalLength,
    intervalLocation,
    ISelection,
    locationFromFace,
    locationFromFaces,
} from "../fabric/tensegrity-types"
import { isIntervalVisible, IStoredState, transition, ViewMode } from "../storage/stored-state"

import { JOINT_MATERIAL, LINE_VERTEX_COLORS, roleMaterial, SELECT_MATERIAL, SUBDUED_MATERIAL } from "./materials"
import { Orbit } from "./orbit"
import { SurfaceComponent } from "./surface-component"

extend({Orbit})

const RADIUS_FACTOR = 0.01
const SPHERE = new SphereGeometry(0.05, 32, 8)
const CYLINDER = new CylinderGeometry(1, 1, 1, 12, 1, false)

declare global {
    namespace JSX {
        /* eslint-disable @typescript-eslint/interface-name-prefix */
        interface IntrinsicElements {
            orbit: ReactThreeFiber.Object3DNode<Orbit, typeof Orbit>
        }

        /* eslint-enable @typescript-eslint/interface-name-prefix */
    }
}

const AMBIENT_COLOR = new Color("#ffffff")
const SPACE_RADIUS = 100
const SPACE_SCALE = 1
const SPACE_GEOMETRY = new SphereGeometry(SPACE_RADIUS, 25, 25)
    .scale(SPACE_SCALE, SPACE_SCALE, SPACE_SCALE)

const TOWARDS_TARGET = 0.01
const TOWARDS_POSITION = 0.01
const ALTITUDE = 1

export function FabricView({pushOverPull, tensegrity, selection, setSelection, storedState$, viewMode}: {
    pushOverPull: FloatFeature,
    tensegrity: Tensegrity,
    selection: ISelection,
    setSelection: (selection: ISelection) => void,
    viewMode: ViewMode,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const [whyThis, updateWhyThis] = useState(0)
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    if (!perspective) {
        throw new Error("Wheres the camera tenseg?")
    }
    const spaceMaterial = useMemo(() => {
        const spaceTexture = new TextureLoader().load("space.jpg")
        return new MeshPhongMaterial({map: spaceTexture, side: BackSide})
    }, [])

    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    const [instance, updateInstance] = useState(tensegrity.instance)
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        updateInstance(tensegrity.instance)
        updateWhyThis(0)
        return () => sub.unsubscribe()
    }, [tensegrity])

    const [storedState, updateStoredState] = useState(storedState$.getValue())
    useEffect(() => {
        const sub = storedState$.subscribe(newState => updateStoredState(newState))
        return () => sub.unsubscribe()
    }, [])
    useEffect(() => {
        if (!orbit.current) {
            return
        }
        orbit.current.autoRotate = storedState.rotating
    }, [storedState])

    const orbit = useUpdate<Orbit>(updatedOrbit => {
        const midpoint = new Vector3(0, ALTITUDE, 0)
        perspective.position.set(midpoint.x, ALTITUDE, midpoint.z + ALTITUDE * 4)
        perspective.lookAt(updatedOrbit.target)
        perspective.fov = 60
        perspective.far = SPACE_RADIUS * 2
        perspective.near = 0.001
        updatedOrbit.object = perspective
        updatedOrbit.minPolarAngle = -0.98 * Math.PI / 2
        updatedOrbit.maxPolarAngle = 0.8 * Math.PI
        updatedOrbit.maxDistance = SPACE_RADIUS * SPACE_SCALE * 0.9
        updatedOrbit.zoomSpeed = 0.5
        updatedOrbit.enableZoom = true
        updatedOrbit.target.set(midpoint.x, midpoint.y, midpoint.z)
        updatedOrbit.update()
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
        const intervals = Object.keys(intervalRec).map(k => intervalRec[k])
        setSelection({faces, intervals})
    }

    useFrame(() => {
        if (!orbit.current) {
            return
        }
        const view = instance.view
        const target = selection.faces.length > 0 ? locationFromFaces(selection.faces) :
            new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        if (storedState.demoCount >= 0) {
            const eye = camera.position
            eye.y += (target.y - eye.y) * TOWARDS_POSITION
            const distanceChange = eye.distanceTo(target) - view.radius() * 1.7
            const towardsDistance = new Vector3().subVectors(target, eye).normalize().multiplyScalar(distanceChange * TOWARDS_POSITION)
            eye.add(towardsDistance)
        }
        orbit.current.update()
        if (viewMode !== ViewMode.Frozen) {
            const busy = tensegrity.iterate()
            if (busy) {
                updateWhyThis(whyThis - 1)
                return
            }
            switch (stage) {
                case Stage.Growing:
                    updateWhyThis(whyThis - 1)
                    break
                case Stage.Shaping:
                    if (whyThis < 0) {
                        updateWhyThis(0)
                    } else {
                        updateWhyThis(whyThis + 1)
                    }
                    if (whyThis === 500 && storedState.demoCount >= 0) {
                        transition(storedState$, {demoCount: storedState.demoCount + 1, rotating: true})
                    }
                    break
            }
            if (stage === Stage.Pretensing) {
                tensegrity.stage = Stage.Pretenst
            }
        }
    })

    function clickInterval(interval: IInterval): void {
        const newSelection = {...selection}
        newSelection.intervals = selection.intervals.filter(joint => joint.index !== interval.index)
        setSelection(newSelection)
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

    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                {viewMode === ViewMode.Frozen ? (
                    <group>
                        {tensegrity.intervals
                            .map(interval => (
                                <IntervalMesh
                                    key={`I${interval.index}`}
                                    pushOverPull={pushOverPull}
                                    tensegrity={tensegrity}
                                    interval={interval}
                                    selected={false}
                                    storedState={storedState}
                                />
                            ))}
                        }
                    </group>
                ) : (
                    <>
                        <lineSegments
                            key="lines"
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
                        pushOverPull={pushOverPull}
                        tensegrity={tensegrity}
                        interval={interval}
                        selected={true}
                        storedState={storedState}
                        onPointerDown={() => clickInterval(interval)}
                    />
                ))}
                {selection.faces
                    .filter(f => (f.faceSelection === FaceSelection.Face)).map(face => (
                        <FaceMesh
                            key={`SF${face.index}`}
                            face={face}
                            selected={true}
                            onPointerDown={() => clickFace(face)}
                        />
                    ))}
                <SurfaceComponent/>
                <mesh key="space" geometry={SPACE_GEOMETRY} material={spaceMaterial}/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function FaceMesh({face, selected, onPointerDown}: { face: IFace, selected: boolean, onPointerDown: () => void }): JSX.Element {
    return (
        <mesh
            key={`SJ${face.index}`}
            geometry={SPHERE}
            position={locationFromFace(face)}
            material={selected ? SELECT_MATERIAL : JOINT_MATERIAL}
            matrixWorldNeedsUpdate={true}
            onPointerDown={onPointerDown}
        />
    )
}

function IntervalMesh({pushOverPull, tensegrity, interval, selected, storedState, onPointerDown}: {
    pushOverPull: FloatFeature,
    tensegrity: Tensegrity,
    interval: IInterval,
    selected: boolean,
    storedState: IStoredState,
    onPointerDown?: () => void,
}): JSX.Element | null {

    const material = isIntervalVisible(interval, storedState) ? roleMaterial(interval.intervalRole) : SUBDUED_MATERIAL
    const stiffness = tensegrity.instance.floatView.stiffnesses[interval.index]
    const radius = RADIUS_FACTOR * stiffness * (isPushRole(interval.intervalRole) ? pushOverPull.numeric : 1.0) * (selected ? 3 : 1)
    const unit = tensegrity.instance.unitVector(interval.index)
    const rotation = new Quaternion().setFromUnitVectors(UP, unit)
    const length = intervalLength(interval)
    const intervalScale = new Vector3(radius, length, radius)
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
    const onPointerDown = (event: React.MouseEvent<Element, MouseEvent>) => setDownEvent(event)
    const onPointerUp = (event: React.MouseEvent<Element, MouseEvent>) => {
        const mesh = meshRef.current
        if (doNotClick(stage) || !downEvent || !mesh) {
            return
        }
        const dx = downEvent.clientX - event.clientX
        const dy = downEvent.clientY - event.clientY
        const distanceSq = dx * dx + dy * dy
        if (distanceSq > 100) {
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
            key="faces"
            ref={meshRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            geometry={tensegrity.instance.floatView.faceGeometry}
        >
            <meshPhongMaterial
                attach="material"
                transparent={true}
                side={FrontSide}
                opacity={0.2}
                color="white"/>
        </mesh>
    )
}

