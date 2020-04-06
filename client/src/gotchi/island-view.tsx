/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo, useState } from "react"
import { useRender, useThree, useUpdate } from "react-three-fiber"
import {
    BufferGeometry,
    FaceColors,
    Float32BufferAttribute,
    Geometry,
    MeshPhongMaterial,
    PerspectiveCamera,
    Vector3,
} from "three"

import { FORWARD, RIGHT } from "../fabric/fabric-instance"
import { DIRECTION_LINE, FACE, JOURNEY_LINE, LINE_VERTEX_COLORS } from "../view/materials"
import { Orbit } from "../view/orbit"

import { Evolution } from "./evolution"
import { Direction, Gotchi } from "./gotchi"
import { Island } from "./island"
import { ALTITUDE, HEMISPHERE_COLOR, SPACE_RADIUS, SPACE_SCALE, SUN_POSITION } from "./island-logic"
import { Journey } from "./journey"
import { Spot } from "./spot"

const TOWARDS_TARGET = 0.01

export function IslandView({island, gotchi, direction, setDirection, evolution, stopEvolution}: {
    island: Island,
    direction: Direction,
    setDirection: (direction: Direction) => void,
    gotchi?: Gotchi,
    evolution?: Evolution,
    stopEvolution: () => void,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera

    const [trigger, setTrigger] = useState(0)

    const midpoint = new Vector3()
    useRender(() => {
        if (evolution) {
            if (evolution.finished) {
                stopEvolution()
                return
            }
            evolution.iterate()
            evolution.getMidpoint(midpoint)
        } else if (gotchi) {
            gotchi.iterate(midpoint)
            if (direction !== gotchi.direction) {
                setDirection(gotchi.direction)
            }
        }
        const towardsTarget = new Vector3().subVectors(midpoint, orbit.current.target).multiplyScalar(TOWARDS_TARGET)
        orbit.current.target.add(towardsTarget)
        orbit.current.update()
        setTrigger(trigger + 1)
    }, true, [gotchi, evolution, trigger])

    const orbit = useUpdate<Orbit>(orb => {
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

    const hexalot = island.hexalots[0]
    const journey = hexalot ? hexalot.journey : undefined
    const spots = useMemo(() => {
        const geometry = new Geometry()
        if (island) {
            island.spots.forEach((spot: Spot, index: number) => {
                spot.addSurfaceGeometry("spots", index, geometry.vertices, geometry.faces)
            })
        }
        geometry.computeBoundingSphere()
        return geometry
    }, [])

    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                {evolution ? <EvolutionScene evolution={evolution}/> : (
                    gotchi ? (<GotchiComponent gotchi={gotchi}/>) : undefined
                )}
                <mesh name="Spots" geometry={spots} material={ISLAND}/>
                {journey && journey.visits.length > 0 ? <JourneyComponent journey={journey}/> : undefined}
                <pointLight distance={1000} decay={0.1} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
            </scene>
        </group>
    )
}

const ISLAND = new MeshPhongMaterial({vertexColors: FaceColors, lights: true})

function directionGeometry(): Geometry {
    const v = () => new Vector3(0, 0, 0)
    const ARROW_LENGTH = 5
    const ARROW_WIDTH = 0.15
    const ARROW_TIP_LENGTH_FACTOR = 1.3
    const ARROW_TIP_WIDTH_FACTOR = 1.5
    const origin = v()
    const arrowToLx = v().addScaledVector(RIGHT, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowToL = v().addScaledVector(RIGHT, -ARROW_WIDTH).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowToR = v().addScaledVector(RIGHT, ARROW_WIDTH).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowToRx = v().addScaledVector(RIGHT, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(FORWARD, ARROW_LENGTH)
    const arrowTip = v().addScaledVector(FORWARD, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
    const geometry = new Geometry()
    geometry.vertices = [
        origin, arrowToL, origin, arrowToR,
        arrowToRx, arrowTip, arrowToLx, arrowTip,
        arrowToRx, arrowToR, arrowToLx, arrowToL,
    ]
    geometry.computeBoundingBox()
    return geometry
}

const DIRECTION_GEOMETRY = directionGeometry()

function GotchiComponent({gotchi}: { gotchi: Gotchi }): JSX.Element {
    return (
        <group>
            <lineSegments
                key="gotchi-lines"
                geometry={gotchi.linesGeometry}
                material={LINE_VERTEX_COLORS}
            />
            {!gotchi.isMature ? undefined : (
                <group>
                    <mesh
                        key="gotchi-faces"
                        geometry={gotchi.facesGeometry}
                        material={FACE}
                    />
                    {!gotchi.showDirection ? undefined : (
                        <lineSegments
                            key="direction-lines"
                            geometry={DIRECTION_GEOMETRY}
                            material={DIRECTION_LINE}
                            quaternion={gotchi.directionQuaternion}
                            position={gotchi.topJointLocation}
                        />
                    )}
                </group>
            )}
        </group>
    )
}

function EvolutionScene({evolution}: { evolution: Evolution }): JSX.Element {
    return (
        <group>
            {evolution.evolvers.map(({gotchi, index}) => (
                <group key={`evolving-gotchi-${index}`}>
                    <lineSegments
                        geometry={gotchi.linesGeometry}
                        material={LINE_VERTEX_COLORS}
                    />
                    {!gotchi.showDirection ? undefined : (
                        <group>
                            <lineSegments
                                geometry={toTargetGeometry(gotchi.topJointLocation, gotchi.target)}
                                material={JOURNEY_LINE}
                            />
                            <lineSegments
                                geometry={DIRECTION_GEOMETRY}
                                material={DIRECTION_LINE}
                                quaternion={gotchi.directionQuaternion}
                                position={gotchi.topJointLocation}
                            />
                        </group>
                    )}
                </group>
            ))}
        </group>
    )
}

function toTargetGeometry(midpoint: Vector3, target: Vector3): Geometry {
    const geom = new Geometry()
    geom.vertices = [midpoint, new Vector3(target.x, midpoint.y, target.z)]
    return geom
}

function JourneyComponent({journey}: { journey: Journey }): JSX.Element {

    function geom(): BufferGeometry | undefined {
        const arrowCount = journey.visits.length - 1
        const geometry = new BufferGeometry()
        const pointsPerArrow = 30
        const positions = new Float32Array(arrowCount * pointsPerArrow)
        const forward = new Vector3()
        const up = new Vector3(0, 1, 0)
        const right = new Vector3()
        const altitude = 5
        for (let walk = 0; walk < arrowCount; walk++) {
            const from = new Vector3().add(journey.visits[walk].center)
            const to = new Vector3().add(journey.visits[walk + 1].center)
            forward.subVectors(to, from)
            right.crossVectors(up, forward)
            to.addScaledVector(forward, -0.1)
            right.normalize()
            forward.normalize().multiplyScalar(4)
            let offset = walk * pointsPerArrow
            // up to shaft
            positions[offset++] = from.x
            positions[offset++] = 0
            positions[offset++] = from.z
            positions[offset++] = from.x
            positions[offset++] = altitude
            positions[offset++] = from.z
            // main shaft
            positions[offset++] = from.x
            positions[offset++] = altitude
            positions[offset++] = from.z
            positions[offset++] = to.x - forward.x
            positions[offset++] = altitude
            positions[offset++] = to.z - forward.z
            // arrow right side
            positions[offset++] = to.x - right.x - forward.x
            positions[offset++] = altitude
            positions[offset++] = to.z - right.z - forward.z
            positions[offset++] = to.x
            positions[offset++] = altitude
            positions[offset++] = to.z
            // arrow left side
            positions[offset++] = to.x + right.x - forward.x
            positions[offset++] = altitude
            positions[offset++] = to.z + right.z - forward.z
            positions[offset++] = to.x
            positions[offset++] = altitude
            positions[offset++] = to.z
            // arrow perpendicular
            positions[offset++] = to.x + right.x - forward.x
            positions[offset++] = altitude
            positions[offset++] = to.z + right.z - forward.z
            positions[offset++] = to.x - right.x - forward.x
            positions[offset++] = altitude
            positions[offset++] = to.z - right.z - forward.z
        }
        geometry.addAttribute("position", new Float32BufferAttribute(positions, 3))
        return geometry
    }

    return (
        <lineSegments
            key="journey"
            geometry={geom()}
            material={JOURNEY_LINE}
        />
    )
}
