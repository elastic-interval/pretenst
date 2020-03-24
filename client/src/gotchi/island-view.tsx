/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { useRender, useThree, useUpdate } from "react-three-fiber"
import {
    BufferGeometry,
    Color,
    FaceColors,
    Float32BufferAttribute,
    Geometry,
    LineBasicMaterial,
    MeshPhongMaterial,
    PerspectiveCamera,
    Vector3,
} from "three"

import { FACE, LINE_VERTEX_COLORS, SCALE_LINE } from "../view/materials"
import { Orbit } from "../view/orbit"

import { Gotchi } from "./gotchi"
import { Hexalot } from "./hexalot"
import { Island } from "./island"
import {
    ALTITUDE,
    HEMISPHERE_COLOR,
    INNER_HEXALOT_SPOTS,
    OUTER_HEXALOT_SIDE,
    POINTER_TOP,
    SPACE_RADIUS,
    SPACE_SCALE,
    SUN_POSITION,
} from "./island-logic"
import { Journey } from "./journey"
import { Spot } from "./spot"

export function IslandView({island, gotchi, selectedSpot, homeHexalot}: {
    island: Island,
    gotchi?: Gotchi,
    selectedSpot?: Spot,
    homeHexalot?: Hexalot,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera

    const [age, setAge] = useState(0)

    useRender(() => {
        try {
            if (!gotchi) {
                return
            }
            const instance = gotchi.instance
            gotchi.iterate()
            setAge(instance.fabric.age)
        } catch (e) {
            console.error("render", e)
        }
    }, true, [gotchi, age])

    function spotsGeometry(): Geometry {
        const geometry = new Geometry()
        if (island) {
            island.spots.forEach((spot: Spot, index: number) => {
                spot.addSurfaceGeometry("spots", index, geometry.vertices, geometry.faces)
            })
        }
        geometry.computeBoundingSphere()
        return geometry
    }

    function selectedSpotGeometry(): Geometry | undefined {
        const geometry = new Geometry()
        if (selectedSpot) {
            const center = selectedSpot.center
            geometry.vertices = [center, new Vector3().addVectors(center, POINTER_TOP)]
            geometry.computeBoundingSphere()
        }
        return geometry
    }

    function homeHexalotGeometry(): Geometry | undefined {
        const geometry = new Geometry()
        if (homeHexalot) {
            homeHexalot.spots.forEach((spot: Spot, index: number) => {
                const outerIndex = index - INNER_HEXALOT_SPOTS
                if (outerIndex < 0) {
                    return
                }
                spot.addRaisedHexagonParts(geometry.vertices, HEXALOT_OUTLINE_HEIGHT, outerIndex, OUTER_HEXALOT_SIDE)
            })
            homeHexalot.centerSpot.addRaisedHexagon(geometry.vertices, HEXALOT_OUTLINE_HEIGHT)
            geometry.computeBoundingSphere()
        }
        return geometry
    }

    function availableSpotsGeometry(): Geometry | undefined {
        const geometry = new Geometry()
        const vacantHexalot = island.vacantHexalot
        if (vacantHexalot) {
            island.spots.filter((spot: Spot) => spot.isCandidateHexalot(vacantHexalot)).forEach((spot: Spot) => {
                spot.addRaisedHexagon(geometry.vertices, HEXALOT_OUTLINE_HEIGHT)
            })
        }
        return geometry
    }

    function vacantHexalotsGeometry(): Geometry | undefined {
        const geometry = new Geometry()
        const vacantHexalot = island.vacantHexalot
        if (vacantHexalot) {
            vacantHexalot.centerSpot.addRaisedHexagon(geometry.vertices, HEXALOT_OUTLINE_HEIGHT)
            vacantHexalot.spots.forEach((spot: Spot, index: number) => {
                const outerIndex = index - INNER_HEXALOT_SPOTS
                if (outerIndex < 0) {
                    return
                }
                spot.addRaisedHexagonParts(geometry.vertices, HEXALOT_OUTLINE_HEIGHT, outerIndex, OUTER_HEXALOT_SIDE)
            })
        }
        return geometry
    }

    const orbit = useUpdate<Orbit>(orb => {
        const midpoint = new Vector3(0, 0, 0)
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
    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                <mesh name="Spots" geometry={spotsGeometry()} material={ISLAND}/>
                {journey && journey.visits.length > 0 ? <JourneyComponent journey={journey}/> : undefined}
                {!homeHexalot ? undefined : (
                    <lineSegments key="HomeHexalot" geometry={homeHexalotGeometry()} material={HOME_HEXALOT}/>
                )}
                {!selectedSpot ? undefined : (
                    <lineSegments key="Pointer" geometry={selectedSpotGeometry()} material={SELECTED_POINTER}/>
                )}
                <lineSegments key="Available" geometry={availableSpotsGeometry()} material={AVAILABLE_HEXALOT}/>
                <lineSegments key="Free" geometry={vacantHexalotsGeometry()} material={AVAILABLE_HEXALOT}/>
                {!gotchi ? undefined : <GotchiComponent gotchi={gotchi}/>}
                <pointLight distance={1000} decay={0.1} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
            </scene>
        </group>
    )
}

const HEXALOT_OUTLINE_HEIGHT = 0.3
const ISLAND = new MeshPhongMaterial({vertexColors: FaceColors, lights: true})
const HOME_HEXALOT = new LineBasicMaterial({color: new Color("white")})
const SELECTED_POINTER = new LineBasicMaterial({color: new Color("yellow")})
const AVAILABLE_HEXALOT = new LineBasicMaterial({color: new Color("green")})

function GotchiComponent({gotchi}: { gotchi: Gotchi }): JSX.Element {
    return (
        <group>
            <lineSegments
                key="lines"
                geometry={gotchi.linesGeometry}
                material={LINE_VERTEX_COLORS}
            />
            <mesh
                key="faces"
                geometry={gotchi.facesGeometry}
                material={FACE}
            />
        </group>
    )
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
            material={SCALE_LINE}
        />
    )
}
