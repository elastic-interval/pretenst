/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { DomEvent, extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { BehaviorSubject } from "rxjs"
import {
    BackSide,
    BufferGeometry,
    Color,
    Euler,
    Float32BufferAttribute,
    Geometry,
    MeshPhongMaterial,
    Object3D,
    PerspectiveCamera,
    SphereGeometry,
    TextureLoader,
    Vector3,
} from "three"

import { doNotClick, FabricFeature, LifePhase } from "../fabric/fabric-engine"
import { SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, IInterval, percentToFactor } from "../fabric/tensegrity-types"
import { IFeatureValue, IStoredState } from "../storage/stored-state"

import { FACE, LINE_VERTEX_COLORS, rainbowMaterial, roleMaterial, SCALE_LINE, SELECT_MATERIAL } from "./materials"
import { Orbit } from "./orbit"
import { SurfaceComponent } from "./surface-component"

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

const SUN_POSITION = new Vector3(0, 600, 0)
const HEMISPHERE_COLOR = new Color("white")
const AMBIENT_COLOR = new Color("#bababa")
const SPACE_RADIUS = 100
const SPACE_SCALE = 1
const SPACE_GEOMETRY = new SphereGeometry(SPACE_RADIUS, 25, 25)
    .scale(SPACE_SCALE, SPACE_SCALE, SPACE_SCALE)

const TOWARDS_TARGET = 0.01
const ALTITUDE = 4
const SCALE_WIDTH = 0.01
const NEEDLE_WIDTH = 2
const SCALE_MAX = 0.45
const RADIUS_FACTOR = 5 // TODO: make it easily adjustable!
const MAX_STIFFNESS = 0.0005 // TODO: make it easily adjustable!

export function FabricView({fabric, selectedIntervals, selectedFaces, setSelectedFaces, selectionMode, ellipsoids, storedState$, lifePhase$}: {
    fabric: TensegrityFabric,
    selectedIntervals: IInterval[],
    selectedFaces: IFace[],
    setSelectedFaces: (faces: IFace[]) => void,
    selectionMode: boolean,
    ellipsoids: boolean,
    storedState$: BehaviorSubject<IStoredState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement
    const [age, setAge] = useState(0)
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    const spaceMaterial = useMemo(() => {
        const spaceTexture = new TextureLoader().load("space.jpg")
        return new MeshPhongMaterial({map: spaceTexture, side: BackSide})
    }, [])

    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
        return () => subscription.unsubscribe()
    }, [])

    const [storedState, updateFabricState] = useState(storedState$.getValue())
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => updateFabricState(newState))
        return () => subscription.unsubscribe()
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
        const instance = fabric.instance
        const target = instance.getMidpoint()
        const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        orbit.current.update()
        let newLifePhase = LifePhase.Busy
        if (!ellipsoids && !selectionMode) {
            newLifePhase = fabric.iterate()
        }
        instance.engine.renderFrame()
        fabric.needsUpdate()
        if (lifePhase !== newLifePhase) {
            if (newLifePhase === LifePhase.Pretensing) {
                lifePhase$.next(newLifePhase)
            } else if (newLifePhase !== LifePhase.Busy) {
                lifePhase$.next(newLifePhase)
            }
        }
        setAge(instance.engine.getAge())
    }, true, [
        fabric, fabric, age, lifePhase, storedState, selectionMode,
    ])

    function toggleFacesSelection(faceToToggle: IFace): void {
        if (selectedFaces.some(selected => selected.index === faceToToggle.index)) {
            setSelectedFaces(selectedFaces.filter(b => b.index !== faceToToggle.index))
        } else {
            setSelectedFaces([...selectedFaces, faceToToggle])
        }
    }

    function SelectedFace({face}: { face: IFace }): JSX.Element {
        const scale = percentToFactor(face.brick.scale) / 6
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.faceMidpoint(face.index)}
                material={SELECT_MATERIAL}
                scale={new Vector3(scale, scale, scale)}
            />
        )
    }

    function IntervalMesh({interval}: { interval: IInterval }): JSX.Element | null {
        const {showPushes, showPulls} = storedState
        let material = roleMaterial(interval.intervalRole)
        if (showPushes || showPulls) {
            material = rainbowMaterial(fabric.instance.strainNuances[interval.index])
            if (!(showPushes && showPulls) && (showPushes && !interval.isPush || showPulls && interval.isPush)) {
                return <group/>
            }
        }
        const linearDensity = fabric.instance.linearDensities[interval.index]
        const {scale, rotation} = fabric.orientInterval(interval, RADIUS_FACTOR * linearDensity)
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

    function StiffnessScale(): JSX.Element {
        const current = orbit.current
        if (!current) {
            return <group/>
        }
        const needleGeometry = new BufferGeometry()
        const lines = strainPushLines(fabric, storedState.featureValues)
        needleGeometry.addAttribute("position", new Float32BufferAttribute(lines, 3))
        needleGeometry.addAttribute("color", new Float32BufferAttribute(fabric.instance.lineColors, 3))
        const toTarget = new Vector3().subVectors(current.target, camera.position).normalize()
        const leftDistance = perspective.fov * perspective.aspect / 132
        const toDaLeft = new Vector3().crossVectors(camera.up, toTarget).normalize().multiplyScalar(leftDistance)
        const scaleGeometry = new Geometry()
        const v = (x: number, y: number) => new Vector3(x, y, 0)
        scaleGeometry.vertices = [
            v(0, -SCALE_MAX), v(0, SCALE_MAX),
            v(-SCALE_WIDTH, SCALE_MAX), v(SCALE_WIDTH, SCALE_MAX),
            v(-SCALE_WIDTH, 0), v(SCALE_WIDTH, 0),
            v(-SCALE_WIDTH, -SCALE_MAX), v(SCALE_WIDTH, -SCALE_MAX),
        ]
        const targetPull = 0.85
        const needlePosition = new Vector3().copy(camera.position).addScaledVector(toTarget, targetPull).add(toDaLeft)
        const scalePosition = new Vector3().copy(camera.position).addScaledVector(toTarget, targetPull + 0.001).add(toDaLeft)
        return (
            <group>
                <lineSegments geometry={needleGeometry} material={LINE_VERTEX_COLORS}
                              position={needlePosition} rotation={camera.rotation}/>
                <lineSegments geometry={scaleGeometry} material={SCALE_LINE}
                              position={scalePosition} rotation={camera.rotation}/>
            </group>
        )
    }

    function EllipsoidView(): JSX.Element {
        return (
            <group>
                {selectedIntervals.length > 0 ? selectedIntervals.map(interval => (
                    <IntervalMesh key={`I${interval.index}`} interval={interval}/>
                )) : fabric.intervals.map(interval => (
                    <IntervalMesh key={`I${interval.index}`} interval={interval}/>
                ))}}
            </group>
        )
    }

    function LineView(): JSX.Element {
        return (
            <group>
                <lineSegments key="lines" geometry={fabric.linesGeometry} material={LINE_VERTEX_COLORS}/>
                {selectedIntervals.map(interval => (
                    <IntervalMesh key={`I${interval.index}`} interval={interval}/>
                ))}
            </group>
        )
    }

    const hideStiffness = storedState.rotating || ellipsoids || lifePhase <= LifePhase.Shaping
    return (
        <group>
            <orbit ref={orbit} args={[perspective, tensegrityView]}/>
            <scene>
                {hideStiffness ? undefined : <StiffnessScale/>}
                {ellipsoids ? <EllipsoidView/> : <LineView/>}
                {!selectionMode ? undefined : (
                    <Faces
                        key="faces"
                        fabric={fabric}
                        lifePhase={lifePhase}
                        selectFace={toggleFacesSelection}
                    />
                )}
                {selectedFaces.map(face => <SelectedFace key={`Face${face.index}`} face={face}/>)}
                <SurfaceComponent ghost={lifePhase <= LifePhase.Slack}/>
                <pointLight key="Sun" distance={10000} decay={0.01} position={SUN_POSITION}/>
                <hemisphereLight key="Hemi" color={HEMISPHERE_COLOR}/>
                <mesh key="space" geometry={SPACE_GEOMETRY} material={spaceMaterial}/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.1}/>
            </scene>
        </group>
    )
}

function Faces({fabric, lifePhase, selectFace}: {
    fabric: TensegrityFabric,
    lifePhase: LifePhase,
    selectFace: (face: IFace) => void,
}): JSX.Element {
    const {raycaster} = useThree()
    const meshRef = useRef<Object3D>()
    const [downEvent, setDownEvent] = useState<DomEvent | undefined>()
    const onPointerDown = (event: DomEvent) => setDownEvent(event)
    const onPointerUp = (event: DomEvent) => {
        const mesh = meshRef.current
        if (doNotClick(lifePhase) || !downEvent || !mesh) {
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

function strainPushLines(fabric: TensegrityFabric, featureValues: Record<FabricFeature, IFeatureValue>): Float32Array {

    const instance = fabric.instance
    const vertices = new Float32Array(instance.engine.getIntervalCount() * 2 * 3)
    const stiffnesses = instance.stiffnesses
    let offset = 0
    fabric.intervals.forEach(interval => {
        const stiffness = stiffnesses[interval.index]
        const height = stiffness / MAX_STIFFNESS * (interval.isPush ? SCALE_MAX : -SCALE_MAX)
        vertices[offset++] = -SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
        vertices[offset++] = SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
    })
    return vertices
}
