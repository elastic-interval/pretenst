/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useMemo, useState } from "react"
import { useRender, useThree, useUpdate } from "react-three-fiber"
import { Color, FaceColors, Geometry, LineBasicMaterial, MeshPhongMaterial, PerspectiveCamera, Vector3 } from "three"

import { FACE, LINE_VERTEX_COLORS } from "../view/materials"
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
import { Spot } from "./spot"

export function IslandView({island, selectedSpot, homeHexalot}: {
    island: Island,
    selectedSpot?: Spot,
    homeHexalot?: Hexalot,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera

    const [age, setAge] = useState(0)
    const gotchi = useMemo(() => island.hexalots[0].createNativeGotchi(), [])

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

    return (
        <group>
            <orbit ref={orbit} args={[perspective, viewContainer]}/>
            <scene>
                <mesh name="Spots" geometry={spotsGeometry()} material={ISLAND}
                    // ref={(mesh: Mesh) => this.props.setMesh("Spots", mesh)}
                />
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
