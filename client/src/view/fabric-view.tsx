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

import { FabricFeature } from "../fabric/fabric-engine"
import { fabricFeatureValue } from "../fabric/fabric-features"
import { doNotClick, hideSurface, IFabricState, LifePhase } from "../fabric/fabric-state"
import { byFaces, IFace, IFacePair, IInterval, percentToFactor } from "../fabric/tensegrity-brick-types"
import { CYLINDER, SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"

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
const SPACE_GEOMETRY = new SphereGeometry(SPACE_RADIUS, 25, 25).scale(SPACE_SCALE, SPACE_SCALE, SPACE_SCALE)

const TOWARDS_TARGET = 0.01
const ALTITUDE = 4
const SCALE_WIDTH = 0.01
const NEEDLE_WIDTH = 2
const SCALE_MAX = 0.45

export function FabricView({fabric, selectedFaces, setSelectedFaces, facePairs, faceSelection, ellipsoids, app$, lifePhase$}: {
    fabric: TensegrityFabric,
    selectedFaces: IFace[],
    setSelectedFaces: (selectedFaces: IFace[]) => void,
    facePairs: IFacePair[],
    faceSelection: boolean,
    ellipsoids: boolean,
    app$: BehaviorSubject<IFabricState>,
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

    const [showPushes, updateShowPushes] = useState(app$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(app$.getValue().showPulls)
    const [rotating, updateRotating] = useState(app$.getValue().rotating)
    useEffect(() => {
        const subscription = app$.subscribe(newState => {
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
            updateRotating(newState.rotating)
        })
        return () => subscription.unsubscribe()
    }, [])
    useEffect(() => {
        orbit.current.autoRotate = rotating
    }, [rotating])

    const radiusFactor = fabricFeatureValue(FabricFeature.RadiusFactor).numeric

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
    }, [fabric])

    const ticks = fabricFeatureValue(FabricFeature.TicksPerFrame).numeric
    useRender(() => {
        if (!fabric) {
            return
        }
        const instance = fabric.instance
        const addToVector = (sum: Vector3, face: IFace) => sum.add(fabric.instance.faceMidpoint(face.index))
        const averageFaceMidpoint = () => selectedFaces.reduce(addToVector, new Vector3()).multiplyScalar(1 / selectedFaces.length)
        const target = selectedFaces.length === 0 ? instance.getMidpoint() : averageFaceMidpoint()
        const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        orbit.current.update()
        let newLifePhase = LifePhase.Busy
        if (ellipsoids || faceSelection) {
            newLifePhase = fabric.iterate(0)
        } else {
            newLifePhase = fabric.iterate(ticks)
            facePairs.forEach(pair => fabric.enforceBrickPair(pair))
            fabric.needsUpdate()
        }
        if (lifePhase !== newLifePhase) {
            if (newLifePhase === LifePhase.Pretensing) {
                lifePhase$.next(newLifePhase)
            } else if (newLifePhase !== LifePhase.Busy) {
                lifePhase$.next(newLifePhase)
            }
        }
        setAge(instance.engine.getAge())
    }, true, [
        fabric, selectedFaces, age, lifePhase, showPushes, showPulls, faceSelection,
    ])

    function toggleFacesSelection(faceToToggle: IFace): void {
        console.log("toggle", faceToToggle.index)
        if (selectedFaces.some(selected => selected.index === faceToToggle.index)) {
            const withoutNewFace = selectedFaces.filter(b => b.index !== faceToToggle.index)
            fabric.selectIntervals(byFaces(withoutNewFace))
            setSelectedFaces(withoutNewFace)
        } else {
            const withNewFace = [...selectedFaces, faceToToggle]
            fabric.selectIntervals(byFaces(withNewFace))
            setSelectedFaces(withNewFace)
        }
    }

    function SelectedFace({selected}: { selected: IFace }): JSX.Element {
        const scale = percentToFactor(selected.brick.scale) / 3
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.faceMidpoint(selected.index)}
                material={SELECT_MATERIAL}
                scale={new Vector3(scale, scale, scale)}
            />
        )
    }

    function BrickPair({brickPair}: { brickPair: IFacePair }): JSX.Element {
        const a = fabric.instance.faceMidpoint(brickPair.faceA.index)
        const b = fabric.instance.faceMidpoint(brickPair.faceB.index)
        const position = new Vector3().addVectors(a, b).multiplyScalar(0.5)
        const radius = (percentToFactor(brickPair.faceA.brick.scale) + percentToFactor(brickPair.faceB.brick.scale)) / 24
        const {scale, rotation} = fabric.orientVectorPair(a, b, radius)
        return (
            <>
                <SelectedFace selected={brickPair.faceA}/>
                <mesh
                    geometry={CYLINDER}
                    rotation={new Euler().setFromQuaternion(rotation)}
                    position={position}
                    material={SELECT_MATERIAL}
                    scale={scale}
                />
                <SelectedFace selected={brickPair.faceB}/>
            </>
        )
    }

    function IntervalMesh({interval}: { interval: IInterval }): JSX.Element | null {
        let material = roleMaterial(interval.intervalRole)
        if (showPushes || showPulls) {
            material = rainbowMaterial(fabric.instance.strainNuances[interval.index])
            if (!(showPushes && showPulls) && (showPushes && !interval.isPush || showPulls && interval.isPush)) {
                return <group/>
            }
        }
        const linearDensity = fabric.instance.linearDensities[interval.index]
        const {scale, rotation} = fabric.orientInterval(interval, radiusFactor * linearDensity)
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
        const lines = strainPushLines(fabric)
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
                {fabric.splitIntervals ? (
                    [
                        ...fabric.splitIntervals.unselected.map(interval => (
                            <IntervalMesh key={`I${interval.index}`} interval={interval}/>
                        )),
                        ...fabric.splitIntervals.selected.map(interval => (
                            <IntervalMesh key={`I${interval.index}`} interval={interval}/>
                        )),
                    ]
                ) : (
                    fabric.intervals.map(interval => (
                        <IntervalMesh key={`I${interval.index}`} interval={interval}/>
                    ))
                )}}
            </group>
        )
    }

    function LineView(): JSX.Element {
        return (
            <group>
                <lineSegments key="lines" geometry={fabric.linesGeometry} material={LINE_VERTEX_COLORS}/>
                {!fabric.splitIntervals ? undefined : (
                    fabric.splitIntervals.selected.map(interval => (
                        <IntervalMesh key={`I${interval.index}`} interval={interval}/>
                    ))
                )}
            </group>
        )
    }

    const hideStiffness = rotating || ellipsoids || lifePhase <= LifePhase.Shaping
    return (
        <group>
            <orbit ref={orbit} args={[perspective, tensegrityView]}/>
            <scene>
                {hideStiffness ? undefined : <StiffnessScale/>}
                {!fabric ? undefined : ellipsoids ? <EllipsoidView/> : <LineView/>}
                {!faceSelection ? undefined : (
                    <Faces
                        key="faces"
                        fabric={fabric}
                        lifePhase={lifePhase}
                        selectFace={toggleFacesSelection}
                    />
                )}
                {selectedFaces.map(brick => <SelectedFace key={`brick${brick.index}`} selected={brick}/>)}
                {facePairs.map((brickPair, index) => <BrickPair key={`Pair${index}`} brickPair={brickPair}/>)}
                {hideSurface(lifePhase) ? undefined : <SurfaceComponent/>}
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
        fabric.clearSelection()
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

function strainPushLines(fabric: TensegrityFabric): Float32Array {

    const maxStiffness = fabricFeatureValue(FabricFeature.MaxStiffness).numeric
    const instance = fabric.instance
    const vertices = new Float32Array(instance.engine.getIntervalCount() * 2 * 3)
    const stiffnesses = instance.stiffnesses
    let offset = 0
    fabric.intervals.forEach(interval => {
        const stiffness = stiffnesses[interval.index]
        const height = stiffness / maxStiffness * (interval.isPush ? SCALE_MAX : -SCALE_MAX)
        vertices[offset++] = -SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
        vertices[offset++] = SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
    })
    return vertices
}
