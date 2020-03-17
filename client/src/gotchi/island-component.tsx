/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Canvas } from "react-three-fiber"
import { Color, FaceColors, Geometry, LineBasicMaterial, MeshPhongMaterial, Vector3 } from "three"

import { Hexalot } from "./hexalot"
import { Island } from "./island"
import { INNER_HEXALOT_SPOTS, OUTER_HEXALOT_SIDE } from "./island-logic"
import { Spot } from "./spot"

const SUN_POSITION = new Vector3(0, 600, 0)
const POINTER_TOP = new Vector3(0, 120, 0)
const HEMISPHERE_COLOR = new Color("white")

export function IslandComponent({island, selectedSpot, homeHexalot}: {
    island: Island,
    selectedSpot?: Spot,
    homeHexalot?: Hexalot,
}): JSX.Element {
    // private spots: Geometry
    // private seeds: Geometry
    // private occupiedHangers: Geometry
    // private vacantHangers: Geometry
    // private homeHexalot?: Geometry
    // private selectedSpot?: Geometry
    // private availableSpots?: Geometry
    // private vacantHexalots?: Geometry

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

    return (
        <Canvas key={island.name} style={{
            backgroundColor: "black",
            borderStyle: "solid",
            borderColor: "#f0ad4e",
            borderWidth: "2px",
        }}>
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
        </Canvas>
    )
}

const HEXALOT_OUTLINE_HEIGHT = 0.3
const ISLAND = new MeshPhongMaterial({vertexColors: FaceColors, lights: true})
const HOME_HEXALOT = new LineBasicMaterial({color: new Color("white")})
const SELECTED_POINTER = new LineBasicMaterial({color: new Color("yellow")})
const AVAILABLE_HEXALOT = new LineBasicMaterial({color: new Color("green")})
