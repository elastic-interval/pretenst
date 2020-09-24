/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { DomEvent, extend, ReactThreeFiber, useFrame, useThree, useUpdate } from "react-three-fiber"
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
    IFace,
    IInterval,
    IJoint,
    intervalLength,
    intervalLocation,
    intervalsTouching,
    ISelection,
    jointLocation,
    locationFromJoints,
} from "../fabric/tensegrity-types"
import { isIntervalVisible, IStoredState, transition } from "../storage/stored-state"

import { JOINT_MATERIAL, LINE_VERTEX_COLORS, roleMaterial, SELECT_MATERIAL, SUBDUED_MATERIAL } from "./materials"
import { Orbit } from "./orbit"
import { SelectionMode } from "./shape-tab"
import { SurfaceComponent } from "./surface-component"

extend({Orbit})

const RADIUS_FACTOR = 50
const SPHERE = new SphereGeometry(0.05, 32, 8)
const SELECTION_SCALE = new Vector3(1.1, 1.1, 1.1)
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

export function FabricView(
    {
        pushOverPull, tensegrity, selection, setSelection, storedState$, shapeSelection, polygons,
    }: {
        pushOverPull: FloatFeature,
        tensegrity: Tensegrity,
        selection: ISelection,
        setSelection: (selection: ISelection) => void,
        shapeSelection: SelectionMode,
        polygons: boolean,
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

    useFrame(() => {
        const view = instance.view
        const target = selection.joints.length > 0 ? locationFromJoints(selection.joints) :
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
        if (!polygons && shapeSelection === SelectionMode.SelectNone) {
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

    function toggleSelectedJoint(jointToToggle: IJoint): void {
        const newSelection = {...selection}
        if (selection.joints.some(selected => selected.index === jointToToggle.index)) {
            newSelection.joints = selection.joints.filter(joint => joint.index !== jointToToggle.index)
        } else {
            newSelection.joints.push(jointToToggle)
        }
        newSelection.intervals = tensegrity.intervals.filter(intervalsTouching(newSelection.joints))
        setSelection(newSelection)
    }

    function toggleSelectedInterval(intervalToToggle: IInterval): void {
        const newSelection = {...selection}
        if (selection.intervals.some(selected => selected.index === intervalToToggle.index)) {
            newSelection.intervals = selection.intervals.filter(joint => joint.index !== intervalToToggle.index)
        } else {
            newSelection.intervals.push(intervalToToggle)
        }
        setSelection(newSelection)
    }

    function toggleSelectedFace(faceToToggle: IFace): void {
        const newSelection = {...selection}
        if (selection.intervals.some(selected => selected.index === faceToToggle.index)) {
            newSelection.faces = selection.faces.filter(face => face.index !== faceToToggle.index)
        } else {
            newSelection.faces.push(faceToToggle)
        }
        setSelection(newSelection)
    }

    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                {polygons ? (
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
                        <Faces
                            tensegrity={tensegrity}
                            stage={stage}
                            clickFace={face => toggleSelectedFace(face)}
                        />
                    </>
                )}
                {selection.intervals.map(interval => (
                    <IntervalMesh
                        key={`SI${interval.index}`}
                        pushOverPull={pushOverPull}
                        tensegrity={tensegrity}
                        interval={interval}
                        selected={true}
                        storedState={storedState}
                        toggleInterval={() => toggleSelectedInterval(interval)}
                    />
                ))}
                {shapeSelection !== SelectionMode.Joints ? undefined : tensegrity.joints.map(joint => (
                    <JointMesh
                        key={`J${joint.index}`}
                        joint={joint}
                        selected={false}
                        toggleJoint={() => toggleSelectedJoint(joint)}
                    />
                ))}
                {shapeSelection !== SelectionMode.Joints ? undefined : selection.joints.map(joint => (
                    <JointMesh
                        key={`SJ${joint.index}`}
                        joint={joint}
                        selected={true}
                        toggleJoint={() => toggleSelectedJoint(joint)}
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

function JointMesh({joint, selected, toggleJoint}: { joint: IJoint, selected: boolean, toggleJoint: () => void }): JSX.Element {
    return (
        <mesh
            key={`SJ${joint.index}`}
            geometry={SPHERE}
            position={jointLocation(joint)}
            material={selected ? SELECT_MATERIAL : JOINT_MATERIAL}
            matrixWorldNeedsUpdate={true}
            scale={selected ? SELECTION_SCALE : undefined}
            onPointerDown={toggleJoint}
        />
    )
}

function IntervalMesh({pushOverPull, tensegrity, interval, selected, storedState, toggleInterval}: {
    pushOverPull: FloatFeature,
    tensegrity: Tensegrity,
    interval: IInterval,
    selected: boolean,
    storedState: IStoredState,
    toggleInterval?: (event: DomEvent) => void,
}): JSX.Element | null {

    const material = selected ? SELECT_MATERIAL :
        isIntervalVisible(interval, storedState) ? roleMaterial(interval.intervalRole) : SUBDUED_MATERIAL
    const stiffness = tensegrity.instance.floatView.stiffnesses[interval.index]
    const radius = RADIUS_FACTOR * stiffness * (isPushRole(interval.intervalRole) ? pushOverPull.numeric : 1.0)
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
            onPointerDown={toggleInterval}
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
    const [downEvent, setDownEvent] = useState<DomEvent | undefined>()
    const onPointerDown = (event: DomEvent) => setDownEvent(event)
    const onPointerUp = (event: DomEvent) => {
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
                opacity={0.4}
                color="white"/>
        </mesh>
    )
}

