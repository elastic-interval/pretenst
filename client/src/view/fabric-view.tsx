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
import { IFace, IInterval, locationFromFace, locationFromFaces } from "../fabric/tensegrity-types"
import { JOINT_RADIUS, PULL_RADIUS, PUSH_RADIUS } from "../pretenst"
import { isIntervalVisible, IStoredState } from "../storage/stored-state"

import { JOINT_MATERIAL, LINE_VERTEX_COLORS, roleMaterial, SELECT_MATERIAL, SUBDUED_MATERIAL } from "./materials"
import { Orbit } from "./orbit"
import { ShapeSelection } from "./shape-tab"
import { SurfaceComponent } from "./surface-component"

extend({Orbit})

const SPHERE = new SphereGeometry(1, 32, 8)
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
                               selectedFaces, setSelectedFaces, storedState$,
                               shapeSelection, polygons,
                           }: {
    tensegrity: Tensegrity,
    selectedIntervals: IInterval[],
    toggleSelectedInterval: (interval: IInterval) => void,
    selectedFaces: IFace[],
    setSelectedFaces: (faces: IFace[]) => void,
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
        const target = selectedFaces.length > 0 ? locationFromFaces(selectedFaces) :
            new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        orbit.current.update()
        if (!polygons && shapeSelection !== ShapeSelection.Faces) {
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

    function toggleFacesSelection(faceToToggle: IFace): void {
        if (selectedFaces.some(selected => selected.index === faceToToggle.index)) {
            setSelectedFaces(selectedFaces.filter(b => b.index !== faceToToggle.index))
        } else {
            setSelectedFaces([...selectedFaces, faceToToggle])
        }
    }

    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                {polygons ? (
                    <PolygonView
                        tensegrity={tensegrity}
                        storedState={storedState}
                    />
                ) : (
                    <LineView
                        tensegrity={tensegrity}
                        selectedIntervals={selectedIntervals}
                        storedState={storedState}
                        toggleSelectedInterval={toggleSelectedInterval}
                    />
                )}
                <Faces
                    key="faces"
                    tensegrity={tensegrity}
                    stage={life.stage}
                    selectFace={toggleFacesSelection}
                />
                {selectedFaces.map(face => (
                    <SelectedFace
                        key={`Face${face.index}`}
                        face={face}
                    />
                ))}
                {life.stage < Stage.Pretensing ? undefined : <SurfaceComponent/>}
                <mesh key="space" geometry={SPACE_GEOMETRY} material={spaceMaterial}/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function SelectedFace({face}: { face: IFace }): JSX.Element {
    const scale = 1 / 8 // TODO
    return (
        <mesh
            geometry={SPHERE}
            position={locationFromFace(face)}
            material={SELECT_MATERIAL}
            scale={new Vector3(scale, scale, scale)}
        />
    )
}

function IntervalMesh({tensegrity, interval, storedState, onPointerDown}: {
    tensegrity: Tensegrity,
    interval: IInterval,
    storedState: IStoredState,
    onPointerDown?: (event: DomEvent) => void,
}): JSX.Element | null {

    const material = isIntervalVisible(interval, storedState) ? roleMaterial(interval.intervalRole) : SUBDUED_MATERIAL
    const radius = interval.isPush ? PUSH_RADIUS : PULL_RADIUS
    const unit = tensegrity.instance.unitVector(interval.index)
    const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
    const length = interval.alpha.location().distanceTo(interval.omega.location())
    const intervalScale = new Vector3(radius, length + (interval.isPush ? -JOINT_RADIUS * 2 : 0), radius)
    const jointScale = new Vector3(JOINT_RADIUS, JOINT_RADIUS, JOINT_RADIUS)
    return (
        <>
            {interval.isPush ? (
                <>
                    <mesh
                        geometry={CYLINDER}
                        position={interval.location()}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={material}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    />
                    <mesh
                        geometry={SPHERE}
                        position={interval.alpha.location()}
                        material={JOINT_MATERIAL}
                        scale={jointScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    />
                    <mesh
                        geometry={SPHERE}
                        position={interval.omega.location()}
                        material={JOINT_MATERIAL}
                        scale={jointScale}
                        matrixWorldNeedsUpdate={true}
                        onPointerDown={onPointerDown}
                    />
                </>
            ) : (
                <mesh
                    geometry={CYLINDER}
                    position={interval.location()}
                    rotation={new Euler().setFromQuaternion(rotation)}
                    scale={intervalScale}
                    material={material}
                    matrixWorldNeedsUpdate={true}
                    onPointerDown={onPointerDown}
                />
            )}
        </>
    )
}

function PolygonView({tensegrity, storedState}: {
    tensegrity: Tensegrity,
    storedState: IStoredState,
}): JSX.Element {
    return (
        <group>
            {tensegrity.intervals
                .map(interval => (
                    <IntervalMesh
                        key={`I${interval.index}`}
                        tensegrity={tensegrity}
                        interval={interval}
                        storedState={storedState}
                    />
                ))}}
        </group>
    )
}

function SelectedInterval({interval, tensegrity, storedState, toggleSelectedInterval}: {
    interval: IInterval,
    tensegrity: Tensegrity,
    storedState: IStoredState,
    toggleSelectedInterval: (interval: IInterval) => void,
}): JSX.Element {
    return (
        <IntervalMesh
            tensegrity={tensegrity}
            interval={interval}
            storedState={storedState}
            onPointerDown={() => toggleSelectedInterval(interval)}
        />
    )
}

function LineView({tensegrity, selectedIntervals, storedState, toggleSelectedInterval}: {
    tensegrity: Tensegrity,
    selectedIntervals: IInterval[],
    storedState: IStoredState,
    toggleSelectedInterval: (interval: IInterval) => void,
}): JSX.Element {
    return (
        <group>
            <lineSegments
                key="lines"
                geometry={tensegrity.instance.floatView.lineGeometry}
                material={LINE_VERTEX_COLORS}
            />
            {selectedIntervals.map(interval => (
                <SelectedInterval
                    key={`SI${interval.index}`}
                    interval={interval}
                    tensegrity={tensegrity}
                    storedState={storedState}
                    toggleSelectedInterval={toggleSelectedInterval}
                />
            ))}
        </group>
    )
}

function Faces({tensegrity, stage, selectFace}: {
    tensegrity: Tensegrity,
    stage: Stage,
    selectFace: (face: IFace) => void,
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
        selectFace(face)
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

