/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole, Stage } from "eig"
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { DomEvent, extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { BehaviorSubject } from "rxjs"
import {
    BackSide,
    Color,
    Euler,
    MeshPhongMaterial,
    Object3D,
    PerspectiveCamera,
    SphereGeometry,
    TextureLoader,
    Vector3,
} from "three"

import { doNotClick } from "../fabric/fabric-engine"
import { SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, IInterval, percentToFactor } from "../fabric/tensegrity-types"
import { IStoredState } from "../storage/stored-state"

import { FACE, LINE_VERTEX_COLORS, rainbowMaterial, roleMaterial, SELECT_MATERIAL } from "./materials"
import { Orbit } from "./orbit"
import { ShapeSelection } from "./shape-tab"

extend({Orbit})

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
const ALTITUDE = 4

export function FabricView({
                               fabric, fabricError, selectedIntervals, selectedFaces, setSelectedFaces, storedState$,
                               shapeSelection, ellipsoids, visibleRoles,
                           }: {
    fabric: TensegrityFabric,
    fabricError: (error: string) => void,
    selectedIntervals: IInterval[],
    selectedFaces: IFace[],
    setSelectedFaces: (faces: IFace[]) => void,
    shapeSelection: ShapeSelection,
    ellipsoids: boolean,
    visibleRoles: IntervalRole[],
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const [age, setAge] = useState(0)
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    const spaceMaterial = useMemo(() => {
        const spaceTexture = new TextureLoader().load("space.jpg")
        return new MeshPhongMaterial({map: spaceTexture, side: BackSide})
    }, [])

    const [life, updateLife] = useState(fabric.life)
    useEffect(() => {
        const sub = fabric.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [fabric])

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

    useRender(() => {
        try {
            const instance = fabric.instance
            const view = instance.view
            const target = new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
            const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
            orbit.current.target.add(towardsTarget)
            orbit.current.update()
            if (!ellipsoids && shapeSelection !== ShapeSelection.Faces) {
                const nextStage = fabric.iterate()
                if (life.stage === Stage.Realizing && nextStage === Stage.Realized) {
                    setTimeout(() => fabric.toStage(Stage.Realized, {}))
                } else if (nextStage !== life.stage && life.stage !== Stage.Realizing && nextStage !== Stage.Busy) {
                    setTimeout(() => fabric.toStage(nextStage, {}))
                }
            }
            setAge(instance.fabric.age)
        } catch (e) {
            fabricError(e)
        }
    }, true, [
        fabric, age, life, shapeSelection, ellipsoids,
    ])

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
                {ellipsoids ? (
                    <EllipsoidView
                        key="ellipsoid"
                        fabric={fabric}
                        selectedIntervals={selectedIntervals}
                        storedState={storedState}
                        visibleRoles={visibleRoles}
                    />
                ) : (
                    <LineView
                        key="lines"
                        fabric={fabric}
                        selectedIntervals={selectedIntervals}
                        storedState={storedState}
                    />
                )}
                {shapeSelection !== ShapeSelection.Faces ? undefined : (
                    <Faces
                        key="faces"
                        fabric={fabric}
                        stage={life.stage}
                        selectFace={toggleFacesSelection}
                    />
                )}
                {selectedFaces.map(face => <SelectedFace key={`Face${face.index}`} fabric={fabric} face={face}/>)}
                {/*<SurfaceComponent/>*/}
                <mesh key="space" geometry={SPACE_GEOMETRY} material={spaceMaterial}/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}

function SelectedFace({fabric, face}: { fabric: TensegrityFabric, face: IFace }): JSX.Element {
    const scale = percentToFactor(face.brick.scale) / 8
    return (
        <mesh
            geometry={SPHERE}
            position={fabric.instance.faceMidpoint(face.index)}
            material={SELECT_MATERIAL}
            scale={new Vector3(scale, scale, scale)}
        />
    )
}

function IntervalMesh({fabric, interval, storedState}: {
    fabric: TensegrityFabric,
    interval: IInterval,
    storedState: IStoredState,
}): JSX.Element | null {

    let material = roleMaterial(interval.intervalRole)
    if (storedState.showPushes || storedState.showPulls) {
        material = rainbowMaterial(fabric.instance.floatView.strainNuances[interval.index])
        if (!(storedState.showPushes && storedState.showPulls) && (storedState.showPushes && !interval.isPush || storedState.showPulls && interval.isPush)) {
            return <group/>
        }
    }
    const linearDensity = fabric.instance.floatView.linearDensities[interval.index]
    const radiusFactor = storedState.featureValues[interval.isPush ? FabricFeature.PushRadiusFactor : FabricFeature.PullRadiusFactor]
    const visualStrain = storedState.featureValues[FabricFeature.VisualStrain]
    const {scale, rotation} = fabric.orientInterval(interval, radiusFactor.numeric * linearDensity, visualStrain.numeric)
    return (
        <mesh
            geometry={SPHERE}
            position={fabric.instance.getIntervalMidpoint(interval.index)}
            rotation={new Euler().setFromQuaternion(rotation)}
            scale={scale}
            material={material}
            matrixWorldNeedsUpdate={true}
        />
    )
}

function EllipsoidView({fabric, visibleRoles, selectedIntervals, storedState}: {
    fabric: TensegrityFabric,
    visibleRoles: IntervalRole[],
    selectedIntervals: IInterval[],
    storedState: IStoredState,
}): JSX.Element {
    return (
        <group>
            {selectedIntervals.length > 0 ? selectedIntervals.map(interval => (
                <IntervalMesh
                    key={`SI${interval.index}`}
                    fabric={fabric}
                    interval={interval}
                    storedState={storedState}
                />
            )) : fabric.intervals.map(interval => (visibleRoles.indexOf(interval.intervalRole) < 0 ? undefined :
                    <IntervalMesh
                        key={`I${interval.index}`}
                        fabric={fabric}
                        interval={interval}
                        storedState={storedState}
                    />
            ))}}
        </group>
    )
}

function LineView({fabric, selectedIntervals, storedState}: {
    fabric: TensegrityFabric,
    selectedIntervals: IInterval[],
    storedState: IStoredState,
}): JSX.Element {
    return (
        <group>
            <lineSegments
                key="lines"
                geometry={fabric.linesGeometry}
                material={LINE_VERTEX_COLORS}
            />
            {selectedIntervals.map(interval => (
                <IntervalMesh
                    key={`SI${interval.index}`}
                    fabric={fabric}
                    interval={interval}
                    storedState={storedState}
                />
            ))}
        </group>
    )
}

function Faces({fabric, stage, selectFace}: {
    fabric: TensegrityFabric,
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
            return fabric.faces[faceIndex]
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
            geometry={fabric.facesGeometry}
            material={FACE}
        />
    )
}

