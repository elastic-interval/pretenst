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

import { FACE, LINE_VERTEX_COLORS, SCALE_LINE } from "../view/materials"
import { Orbit } from "../view/orbit"

import { Evolution } from "./evolution"
import { Gotchi } from "./gotchi"
import { Hexalot } from "./hexalot"
import { Island } from "./island"
import { ALTITUDE, HEMISPHERE_COLOR, SPACE_RADIUS, SPACE_SCALE, SUN_POSITION } from "./island-logic"
import { Journey } from "./journey"
import { Spot } from "./spot"

export function IslandView({island, selectedSpot, homeHexalot, gotchi, evolution}: {
    island: Island,
    selectedSpot?: Spot,
    homeHexalot?: Hexalot,
    gotchi?: Gotchi,
    evolution?: Evolution,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera

    const [trigger, setTrigger] = useState(0)

    useRender(() => {
        if (evolution) {
            evolution.iterate()
        } else if (gotchi) {
            gotchi.iterate()
        }
        setTrigger(trigger + 1)
    }, true, [gotchi, evolution, trigger])

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
                <mesh name="Spots" geometry={spots} material={ISLAND}/>
                {journey && journey.visits.length > 0 ? <JourneyComponent journey={journey}/> : undefined}
                {!evolution ? (
                    !gotchi ? undefined : <GotchiComponent gotchi={gotchi}/>
                ) : (
                    <EvolutionComponent evolution={evolution}/>
                )}
                <pointLight distance={1000} decay={0.1} position={SUN_POSITION}/>
                <hemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
            </scene>
        </group>
    )
}

const ISLAND = new MeshPhongMaterial({vertexColors: FaceColors, lights: true})

function GotchiComponent({gotchi}: { gotchi: Gotchi }): JSX.Element {
    return (
        <group>
            <lineSegments
                key="gotchi-lines"
                geometry={gotchi.linesGeometry}
                material={LINE_VERTEX_COLORS}
            />
            {!gotchi.isMature ? undefined : (
                <mesh
                    key="gotchi-faces"
                    geometry={gotchi.facesGeometry}
                    material={FACE}
                />
            )}
        </group>
    )
}

function EvolutionComponent({evolution}: { evolution: Evolution }): JSX.Element {
    // <lineSegments
    //     key={`evolving-gotchi-${index}`}
    //     geometry={gotchi.linesGeometry}
    //     material={LINE_VERTEX_COLORS}
    // />
    return (
        <group>
            {evolution.evolvers.map(({gotchi, index}) => (
                <mesh
                    key={`evolving-gotchi-${index}`}
                    geometry={gotchi.facesGeometry}
                    material={FACE}
                />
            ))}
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
