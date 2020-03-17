/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useThree, useUpdate } from "react-three-fiber"
import { Color, FaceColors, Geometry, LineBasicMaterial, MeshPhongMaterial, PerspectiveCamera, Vector3 } from "three"

import { Orbit } from "../view/orbit"

import { Hexalot } from "./hexalot"
import { Island } from "./island"
import { INNER_HEXALOT_SPOTS, OUTER_HEXALOT_SIDE } from "./island-logic"
import { Spot } from "./spot"

const SUN_POSITION = new Vector3(0, 600, 0)
const POINTER_TOP = new Vector3(0, 120, 0)
const HEMISPHERE_COLOR = new Color("white")
const ALTITUDE = 40
const SPACE_RADIUS = 100
const SPACE_SCALE = 1

export function IslandComponent({island, selectedSpot, homeHexalot}: {
    island: Island,
    selectedSpot?: Spot,
    homeHexalot?: Hexalot,
}): JSX.Element {

    const viewContainer = document.getElementById("view-container") as HTMLElement
    const {camera} = useThree()
    const perspective = camera as PerspectiveCamera
    if (!perspective) {
        throw new Error("Wheres the camera?")
    }

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
                <pointLight distance={1000} decay={0.01} position={SUN_POSITION}/>
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
