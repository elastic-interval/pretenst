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
import { byBrick, IBrick, IInterval } from "../fabric/tensegrity-brick-types"
import { SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ATTENUATED, FACE, FACE_SPHERE, LINE, PULL_MATERIAL, PUSH_MATERIAL, SCALE_LINE, SLACK } from "./materials"
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
const SPACE_GEOMETRY = new SphereGeometry(SPACE_RADIUS, 25, 25)

const TOWARDS_TARGET = 0.01
const ALTITUDE = 4
const SCALE_WIDTH = 0.01
const NEEDLE_WIDTH = 2
const SCALE_MAX = 0.45

export function FabricView({fabric, selectedBrick, setSelectedBrick, fabricState$, lifePhase$}: {
    fabric: TensegrityFabric,
    selectedBrick?: IBrick,
    setSelectedBrick: (selectedBrick: IBrick) => void,
    fabricState$: BehaviorSubject<IFabricState>,
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement
    const [age, setAge] = useState(0)
    const [targetBrick, setTargetBrick] = useState(false)
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
    })
    useEffect(() => {
        orbit.current.autoRotate = fabricState$.getValue().rotating
    }, [fabric])
    const [frozen, updateFrozen] = useState(fabricState$.getValue().frozen)
    const [showPushes, updateShowPushes] = useState(fabricState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(fabricState$.getValue().showPulls)
    const [rotating, updateRotating] = useState(fabricState$.getValue().rotating)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateFrozen(newState.frozen)
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
            updateRotating(newState.rotating)
        })
        return () => subscription.unsubscribe()
    })
    useEffect(() => {
        orbit.current.autoRotate = rotating
    }, [rotating])

    const orbit = useUpdate<Orbit>(orb => {
        const midpoint = new Vector3(0, ALTITUDE, 0)
        perspective.position.set(midpoint.x, ALTITUDE, midpoint.z + ALTITUDE * 4)
        perspective.lookAt(orbit.current.target)
        perspective.fov = 60
        perspective.far = SPACE_RADIUS * 2
        orb.object = perspective
        orb.minPolarAngle = -0.98 * Math.PI / 2
        orb.maxPolarAngle = 0.8 * Math.PI
        orb.maxDistance = SPACE_RADIUS * 0.9
        orb.zoomSpeed = 0.5
        orb.enableZoom = true
        orb.target.set(midpoint.x, midpoint.y, midpoint.z)
        orb.update()
    }, [fabric])

    useRender(() => {
        if (!fabric) {
            return
        }
        const instance = fabric.instance
        const target = targetBrick && selectedBrick ? fabric.brickMidpoint(selectedBrick) : instance.getMidpoint()
        const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        orbit.current.update()
        if (!frozen) {
            const newLifePhase = fabric.iterate(fabricFeatureValue(FabricFeature.TicksPerFrame))
            fabric.needsUpdate()
            if (lifePhase !== newLifePhase && newLifePhase !== LifePhase.Busy) {
                lifePhase$.next(newLifePhase)
            }
        }
        setAge(instance.engine.getAge())
    }, true, [fabric, targetBrick, selectedBrick, age, lifePhase, frozen])

    const selectBrick = (newSelectedBrick: IBrick) => {
        if (fabric) {
            fabric.selectIntervals(byBrick(newSelectedBrick))
            setSelectedBrick(newSelectedBrick)
            setTargetBrick(true)
        }
    }

    function SelectedFace(): JSX.Element {
        if (!selectedBrick) {
            return <group/>
        }
        const scale = 0.6
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.brickMidpoint(selectedBrick)}
                material={FACE_SPHERE}
                scale={new Vector3(scale, scale, scale)}
            />
        )
    }


    const girth = fabricFeatureValue(FabricFeature.Girth)

    function IntervalMesh({interval, attenuated}: {
        interval: IInterval,
        attenuated: boolean,
    }): JSX.Element {
        const material = () => {
            if (attenuated) {
                return ATTENUATED
            }
            const strain = fabric.instance.strains[interval.index]
            const slack = strain < fabricFeatureValue(FabricFeature.SlackThreshold)
            return slack ? SLACK : interval.isPush ? PUSH_MATERIAL : PULL_MATERIAL
        }
        const linearDensity = fabric.instance.linearDensities[interval.index]
        const {scale, rotation} = fabric.orientInterval(interval, girth * linearDensity)
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.getIntervalMidpoint(interval.index)}
                rotation={new Euler().setFromQuaternion(rotation)}
                scale={scale}
                material={material()}
                matrixWorldNeedsUpdate={true}
            />
        )
    }

    function ElasticScale(): JSX.Element {
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
                <lineSegments geometry={needleGeometry} material={LINE}
                              position={needlePosition} rotation={camera.rotation}/>
                <lineSegments geometry={scaleGeometry} material={SCALE_LINE}
                              position={scalePosition} rotation={camera.rotation}/>
            </group>
        )
    }

    return (
        <group>
            <orbit ref={orbit} args={[perspective, tensegrityView]}/>
            <scene>
                {rotating || lifePhase <= LifePhase.Shaping ? undefined : <ElasticScale/>}
                {!fabric ? undefined : frozen ? (
                    <group>
                        {fabric.splitIntervals ? (
                            [
                                ...fabric.splitIntervals.unselected.map(interval => (
                                    <IntervalMesh key={`I${interval.index}`} interval={interval}
                                                  attenuated={true}/>
                                )),
                                ...fabric.splitIntervals.selected.map(interval => (
                                    <IntervalMesh key={`I${interval.index}`} interval={interval}
                                                  attenuated={false}/>
                                )),
                            ]
                        ) : (
                            fabric.intervals.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={false}/>
                            ))
                        )}}
                    </group>
                ) : (
                    <group>
                        <lineSegments key="lines" geometry={fabric.linesGeometry} material={LINE}/>
                        {!fabric.splitIntervals ? undefined : (
                            fabric.splitIntervals.selected.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={false}/>
                            ))
                        )}
                    </group>
                )}
                {!(showPushes && showPulls) ? undefined : (
                    <Faces
                        fabric={fabric}
                        lifePhase={lifePhase}
                        selectBrick={selectBrick}
                    />
                )}
                <SelectedFace/>
                {hideSurface(lifePhase) ? undefined : <SurfaceComponent/>}
                <pointLight key="Sun" distance={10000} decay={0.01} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                <mesh geometry={SPACE_GEOMETRY} material={spaceMaterial}/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.1}/>
            </scene>
        </group>
    )
}

function Faces({fabric, lifePhase, selectBrick}: {
    fabric: TensegrityFabric,
    lifePhase: LifePhase,
    selectBrick: (brick: IBrick) => void,
}): JSX.Element {
    const {raycaster} = useThree()
    const meshRef = useRef<Object3D>()
    const [downEvent, setDownEvent] = useState<DomEvent | undefined>()
    const onPointerDown = (event: DomEvent) => {
        setDownEvent(event)
    }
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
        selectBrick(face.brick)
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

    const maxElastic = fabricFeatureValue(FabricFeature.MaxElastic)

    const instance = fabric.instance
    const vertices = new Float32Array(instance.engine.getIntervalCount() * 2 * 3)
    const elasticities = instance.elasticities
    let offset = 0
    fabric.intervals.forEach(interval => {
        const elastic = elasticities[interval.index]
        const height = elastic / maxElastic * (interval.isPush ? SCALE_MAX : -SCALE_MAX)
        vertices[offset++] = -SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
        vertices[offset++] = SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
    })
    return vertices
}
