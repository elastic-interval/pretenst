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

import { doNotClick, Y_AXIS } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { TensegrityBuilder } from "../fabric/tensegrity-builder"
import {
    IFace,
    IInterval,
    IJoint,
    intervalLength,
    intervalLocation,
    jointLocation,
    locationFromJoints,
} from "../fabric/tensegrity-types"
import { PULL_RADIUS, PUSH_RADIUS } from "../pretenst"
import { isIntervalVisible, IStoredState } from "../storage/stored-state"

import { JOINT_MATERIAL, LINE_VERTEX_COLORS, roleMaterial, SELECT_MATERIAL, SUBDUED_MATERIAL } from "./materials"
import { Orbit } from "./orbit"
import { ShapeSelection } from "./shape-tab"
import { SurfaceComponent } from "./surface-component"

extend({Orbit})

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
const ALTITUDE = 1

export function FabricView({
                               tensegrity,
                               selectedIntervals, toggleSelectedInterval,
                               selectedJoints, setSelectedJoints, storedState$,
                               shapeSelection, polygons,
                           }: {
    tensegrity: Tensegrity,
    selectedIntervals: IInterval[],
    toggleSelectedInterval: (interval: IInterval) => void,
    selectedJoints: IJoint[],
    setSelectedJoints: (joints: IJoint[]) => void,
    shapeSelection: ShapeSelection,
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

    const [life, updateLife] = useState(tensegrity.life$.getValue())
    const [instance, updateInstance] = useState(tensegrity.instance)
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        updateInstance(tensegrity.instance)
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

    const orbit = useUpdate<Orbit>(orb => {
        const midpoint = new Vector3(0, ALTITUDE, 0)
        perspective.position.set(midpoint.x, ALTITUDE, midpoint.z + ALTITUDE * 4)
        perspective.lookAt(orbit.current.target)
        perspective.fov = 60
        perspective.far = SPACE_RADIUS * 2
        perspective.near = 0.001
        orb.object = perspective
        orb.minPolarAngle = -0.98 * Math.PI / 2
        orb.maxPolarAngle = 0.8 * Math.PI
        orb.maxDistance = SPACE_RADIUS * SPACE_SCALE * 0.9
        orb.zoomSpeed = 0.5
        orb.enableZoom = true
        orb.target.set(midpoint.x, midpoint.y, midpoint.z)
        orb.update()
    }, [])

    useFrame(() => {
        const view = instance.view
        const target = selectedJoints.length > 0 ? locationFromJoints(selectedJoints) :
            new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        orbit.current.update()
        if (!polygons && shapeSelection !== ShapeSelection.Joints) {
            const nextStage = tensegrity.iterate()
            if (life.stage === Stage.Pretensing && nextStage === Stage.Pretenst) {
                tensegrity.transition = {stage: Stage.Pretenst}
            } else if (nextStage !== undefined && nextStage !== life.stage && life.stage !== Stage.Pretensing) {
                tensegrity.transition = {stage: nextStage}
            }
            switch (nextStage) {
                case Stage.Pretensing:
                case Stage.Pretenst:
                    break
                default:
                    updateWhyThis(whyThis + 1)
            }

        }
    })

    function toggleSelectedJoint(jointToToggle: IJoint): void {
        if (selectedJoints.some(selected => selected.index === jointToToggle.index)) {
            setSelectedJoints(selectedJoints.filter(b => b.index !== jointToToggle.index))
        } else {
            setSelectedJoints([...selectedJoints, jointToToggle])
        }
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
                            stage={life.stage}
                            clickFace={face => {
                                const builder = new TensegrityBuilder(tensegrity)
                                builder.createTwistOn(face, face.scale, false)
                            }}
                        />
                    </>
                )}
                {selectedIntervals.map(interval => (
                    <IntervalMesh
                        key={`SI${interval.index}`}
                        tensegrity={tensegrity}
                        interval={interval}
                        selected={true}
                        storedState={storedState}
                        toggleInterval={() => toggleSelectedInterval(interval)}
                    />
                ))}
                {shapeSelection !== ShapeSelection.Joints ? undefined : tensegrity.joints.map(joint => (
                    <JointMesh
                        key={`J${joint.index}`}
                        joint={joint}
                        selected={false}
                        toggleJoint={() => toggleSelectedJoint(joint)}
                    />
                ))}
                {shapeSelection !== ShapeSelection.Joints ? undefined : selectedJoints.map(joint => (
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

function IntervalMesh({tensegrity, interval, selected, storedState, toggleInterval}: {
    tensegrity: Tensegrity,
    interval: IInterval,
    selected: boolean,
    storedState: IStoredState,
    toggleInterval?: (event: DomEvent) => void,
}): JSX.Element | null {

    const material = selected ? SELECT_MATERIAL :
        isIntervalVisible(interval, storedState) ? roleMaterial(interval.intervalRole) : SUBDUED_MATERIAL
    const radius = interval.isPush ? PUSH_RADIUS : PULL_RADIUS
    const unit = tensegrity.instance.unitVector(interval.index)
    const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
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

