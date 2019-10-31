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
import { FabricInstance } from "../fabric/fabric-instance"
import { doNotClick, hideSurface, LifePhase } from "../fabric/life-phase"
import { byBrick, IBrick, IInterval } from "../fabric/tensegrity-brick-types"
import { SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ATTENUATED, BAR, CABLE, FACE, FACE_SPHERE, LINE, SCALE_LINE, SLACK } from "./materials"
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
const SPACE_GEOMETRY = new SphereGeometry(600, 25, 25)

const TOWARDS_TARGET = 0.01
const ALTITUDE = 4
const BAR_GIRTH = 100
const CABLE_GIRTH = 30
const SCALE_WIDTH = 0.01
const NEEDLE_WIDTH = 2
const SCALE_MAX = 0.5

export function FabricView({
                               fabric, lifePhase$, pretensingStep$, selectedBrick,
                               setSelectedBrick, autoRotate, fastMode, showBars, showCables,
                           }: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject<LifePhase>,
    pretensingStep$: BehaviorSubject<number>,
    selectedBrick?: IBrick,
    setSelectedBrick: (selection?: IBrick) => void,
    autoRotate: boolean,
    fastMode: boolean,
    showBars: boolean,
    showCables: boolean,
}): JSX.Element {

    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement
    const [age, setAge] = useState(0)
    const [downEvent, setDownEvent] = useState<DomEvent | undefined>()
    const [targetBrick, setTargetBrick] = useState(false)
    const {camera, raycaster} = useThree()
    const perspective = camera as PerspectiveCamera
    const spaceMaterial = useMemo(() => {
        const spaceTexture = new TextureLoader().load("space.jpg")
        return new MeshPhongMaterial({map: spaceTexture, side: BackSide})
    }, [])

    useEffect(() => pretensingStep$.next(fabric.pretensingStep), [fabric.pretensingStep])

    const orbit = useUpdate<Orbit>(orb => {
        const midpoint = new Vector3(0, ALTITUDE, 0)
        perspective.position.set(midpoint.x, ALTITUDE, midpoint.z + ALTITUDE * 4)
        perspective.lookAt(orbit.current.target)
        perspective.fov = 65
        orb.object = perspective
        orb.minPolarAngle = -0.98 * Math.PI / 2
        orb.maxPolarAngle = 0.8 * Math.PI
        orb.maxDistance = 1000
        orb.minDistance = 15
        orb.zoomSpeed = 0.3
        orb.enableZoom = true
        orb.target.set(midpoint.x, midpoint.y, midpoint.z)
        orb.update()
    }, [fabric])

    useRender(() => {
        const instance = fabric.instance
        const target = targetBrick && selectedBrick ? fabric.brickMidpoint(selectedBrick) : instance.getMidpoint()
        const towardsTarget = new Vector3().subVectors(target, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        orbit.current.update()
        orbit.current.autoRotate = autoRotate
        if (fastMode) {
            fabric.iterate(fabricFeatureValue(FabricFeature.TicksPerFrame))
            fabric.needsUpdate()
        }
        if (lifePhase$.getValue() !== fabric.lifePhase) {
            lifePhase$.next(fabric.lifePhase)
        }
        setAge(instance.engine.getAge())
    }, true, [fabric, targetBrick, selectedBrick, age, fabric.lifePhase, fastMode, autoRotate])


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

    function Faces(): JSX.Element {
        const meshRef = useRef<Object3D>()
        const onPointerDown = (event: DomEvent) => {
            setDownEvent(event)
        }
        const onPointerUp = (event: DomEvent) => {
            const mesh = meshRef.current
            if (doNotClick(lifePhase$.getValue()) || !downEvent || !mesh) {
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
                ref={meshRef}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                geometry={fabric.facesGeometry}
                material={FACE}
            />
        )
    }

    function IntervalMesh({interval, attenuated}: {
        interval: IInterval,
        attenuated: boolean,
    }): JSX.Element {
        const elastic = fabric.instance.elastics[interval.index]
        const bar = interval.isBar
        const strain = fabric.instance.strains[interval.index] * (bar ? -1 : 1)
        const girth = Math.sqrt(elastic) * (bar ? BAR_GIRTH : CABLE_GIRTH)
        const {scale, rotation} = fabric.orientInterval(interval, girth)
        const slackThreshold = fabricFeatureValue(FabricFeature.SlackThreshold)
        const material = strain < slackThreshold ? SLACK : attenuated ? ATTENUATED : bar ? BAR : CABLE
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

    function ElasticScale(): JSX.Element {
        const current = orbit.current
        if (!current) {
            return <group/>
        }
        const needleGeometry = new BufferGeometry()
        const lines = strainBarLines(fabric.instance, showBars, showCables)
        needleGeometry.addAttribute("position", new Float32BufferAttribute(lines, 3))
        needleGeometry.addAttribute("color", new Float32BufferAttribute(fabric.instance.getLineColors(), 3))
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
        const needlePosition = new Vector3().copy(camera.position).addScaledVector(toTarget, 0.8).add(toDaLeft)
        const scalePosition = new Vector3().copy(camera.position).addScaledVector(toTarget, 0.8001).add(toDaLeft)
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
                {autoRotate ? undefined : <ElasticScale/>}
                {fastMode ? (
                    <group>
                        <lineSegments key="lines" geometry={fabric.linesGeometry} material={LINE}/>
                        {!fabric.splitIntervals || !selectedBrick ? undefined : (
                            fabric.splitIntervals.selected.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={false}/>
                            ))
                        )}
                    </group>
                ) : (
                    <group>
                        {fabric.splitIntervals ? (
                            [
                                ...fabric.splitIntervals.unselected.map(interval => (
                                    <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={true}/>
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
                )}
                {(showBars && showCables) ? <Faces/> : undefined}
                <SelectedFace/>
                {hideSurface(lifePhase$.getValue()) ? undefined : <SurfaceComponent/>}
                <pointLight key="Sun" distance={10000} decay={0.01} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                <mesh geometry={SPACE_GEOMETRY} material={spaceMaterial}/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.1}/>
            </scene>
        </group>
    )
}

function strainBarLines(instance: FabricInstance, showBars: boolean, showCables: boolean): Float32Array {

    const maxBar = fabricFeatureValue(FabricFeature.BarMaxElastic)
    const maxCable = fabricFeatureValue(FabricFeature.CableMaxElastic)

    function elasticToHeight(elastic: number): number {
        if (showBars && showCables) {
            return elastic / Math.max(maxBar, maxCable) - 0.5
        } else if (showBars) {
            return elastic / maxBar - 0.5
        } else if (showCables) {
            return elastic / maxCable - 0.5
        } else {
            return 0
        }
    }

    const vertices = new Float32Array(instance.engine.getIntervalCount() * 2 * 3)
    instance.elastics.forEach((elastic, index) => {
        const height = elasticToHeight(elastic)
        let offset = index * 6
        vertices[offset++] = -SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
        vertices[offset++] = SCALE_WIDTH * NEEDLE_WIDTH
        vertices[offset++] = height
        vertices[offset++] = 0
    })
    return vertices
}
