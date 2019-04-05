/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { Color, Geometry, Mesh, Vector3 } from "three"

import { HUNG_ALTITUDE } from "../body/fabric"
import { HEXALOT_OUTLINE_HEIGHT, INNER_HEXALOT_SPOTS, OUTER_HEXALOT_SIDE } from "../island/constants"
import { IAppState } from "../state/app-state"

import {
    AVAILABLE_HEXALOT,
    GOTCHI,
    HANGER_FREE,
    HANGER_OCCUPIED,
    HOME_HEXALOT,
    ISLAND,
    SELECTED_POINTER,
} from "./materials"
import { MeshKey } from "./spot-selector"

const SUN_POSITION = new Vector3(0, 600, 0)
const POINTER_TOP = new Vector3(0, 120, 0)
const HEMISPHERE_COLOR = new Color("white")

export interface IslandComponentProps {
    appState: IAppState
    setMesh: (key: string, ref: Mesh) => void
    userId?: string
}

export class IslandComponent extends React.Component<IslandComponentProps, object> {
    private appStateNonce = -1
    private spots: Geometry
    private seeds: Geometry
    private occupiedHangers: Geometry
    private vacantHangers: Geometry
    private homeHexalot?: Geometry
    private selectedSpot?: Geometry
    private availableSpots?: Geometry
    private vacantHexalots?: Geometry

    constructor(props: IslandComponentProps) {
        super(props)
        this.spots = this.spotsGeometry
        this.seeds = this.seedsGeometry
        this.occupiedHangers = this.occupiedHangersGeometry
        this.vacantHangers = this.vacantHangersGeometry
        this.selectedSpot = this.selectedSpotGeometry
        this.homeHexalot = this.homeHexalotGeometry
        this.availableSpots = this.availableSpotsGeometry
        this.vacantHexalots = this.vacantHexalotsGeometry
    }

    public componentWillUnmount(): void {
        this.disposeGeometry()
    }

    public render(): JSX.Element | boolean {
        const appState = this.props.appState
        const island = appState.island
        if (!island) {
            return false
        }
        if (appState.nonce > this.appStateNonce) {
            this.disposeGeometry()
            island.spots.forEach(spot => spot.faceNames = [])
            this.spots = this.spotsGeometry
            this.seeds = this.seedsGeometry
            this.occupiedHangers = this.occupiedHangersGeometry
            this.vacantHangers = this.vacantHangersGeometry
            this.selectedSpot = this.selectedSpotGeometry
            this.homeHexalot = this.homeHexalotGeometry
            this.availableSpots = this.availableSpotsGeometry
            this.vacantHexalots = this.vacantHexalotsGeometry
            this.appStateNonce = appState.nonce
        }
        return (
            <R3.Object3D key={island.name}>
                <R3.Mesh name="Spots" geometry={this.spots} material={ISLAND}
                         ref={(mesh: Mesh) => this.props.setMesh(MeshKey.SPOTS_KEY, mesh)}
                />
                <R3.Mesh name="Seeds" geometry={this.seeds} material={GOTCHI}/>
                <R3.LineSegments key="HangersOccupied" geometry={this.occupiedHangers} material={HANGER_OCCUPIED}/>
                <R3.LineSegments key="HangersFree" geometry={this.vacantHangers} material={HANGER_FREE}/>
                {!this.homeHexalot ? undefined : (
                    <R3.LineSegments key="HomeHexalot" geometry={this.homeHexalot} material={HOME_HEXALOT}/>
                )}
                {!this.selectedSpot ? undefined : (
                    <R3.LineSegments key="Pointer" geometry={this.selectedSpot} material={SELECTED_POINTER}/>
                )}
                {!this.availableSpots ? undefined : (
                    <R3.LineSegments key="Available" geometry={this.availableSpots} material={AVAILABLE_HEXALOT}/>
                )}
                {!this.vacantHexalots ? undefined : (
                    <R3.LineSegments key="Free" geometry={this.vacantHexalots} material={AVAILABLE_HEXALOT}/>
                )}
                <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
            </R3.Object3D>
        )
    }

    // =================================================================================================================

    private get spotsGeometry(): Geometry {
        const geometry = new Geometry()
        const island = this.props.appState.island
        if (island) {
            island.spots.forEach((spot, index) => {
                spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces)
            })
        }
        geometry.computeBoundingSphere()
        return geometry
    }

    private get occupiedHangersGeometry(): Geometry {
        const geometry = new Geometry()
        const island = this.props.appState.island
        if (island) {
            const vacantHexalot = island.vacantHexalot
            island.hexalots.forEach(hexalot => {
                if (vacantHexalot && vacantHexalot.id === hexalot.id) {
                    return
                }
                hexalot.centerSpot.addHangerGeometry(geometry.vertices)
            })
        }
        return geometry
    }

    private get vacantHangersGeometry(): Geometry {
        const geometry = new Geometry()
        const island = this.props.appState.island
        const vacantHexalot = island ? island.vacantHexalot : undefined
        if (vacantHexalot) {
            vacantHexalot.centerSpot.addHangerGeometry(geometry.vertices)
        }
        return geometry
    }

    private get seedsGeometry(): Geometry {
        const geometry = new Geometry()
        const island = this.props.appState.island
        if (island) {
            const hexalots = island.hexalots
            const activeHexalotId = this.activeHexalotId
            hexalots.forEach(hexalot => {
                if (!activeHexalotId || hexalot.id !== activeHexalotId) {
                    hexalot.centerSpot.addSeed(hexalot.rotation, MeshKey.SEEDS_KEY, geometry.vertices, geometry.faces)
                }
            })
        }
        geometry.computeFaceNormals()
        geometry.computeBoundingSphere()
        return geometry
    }

    private get selectedSpotGeometry(): Geometry | undefined {
        const selectedSpot = this.props.appState.selectedSpot
        if (!selectedSpot) {
            return undefined
        }
        const center = selectedSpot.center
        const target = selectedSpot.centerOfHexalot ? new Vector3(0, HUNG_ALTITUDE, 0).add(center) : center
        const geometry = new Geometry()
        geometry.vertices = [target, new Vector3().addVectors(target, POINTER_TOP)]
        return geometry
    }

    private get homeHexalotGeometry(): Geometry | undefined {
        const homeHexalot = this.props.appState.homeHexalot
        if (!homeHexalot) {
            return undefined
        }
        const geometry = new Geometry()
        homeHexalot.spots.forEach((spot, index) => {
            const outerIndex = index - INNER_HEXALOT_SPOTS
            if (outerIndex < 0) {
                return
            }
            spot.addRaisedHexagonParts(geometry.vertices, HEXALOT_OUTLINE_HEIGHT, outerIndex, OUTER_HEXALOT_SIDE)
        })
        homeHexalot.centerSpot.addRaisedHexagon(geometry.vertices, HEXALOT_OUTLINE_HEIGHT)
        homeHexalot.centerSpot.addHangerGeometry(geometry.vertices)
        geometry.computeBoundingSphere()
        return geometry
    }

    private get availableSpotsGeometry(): Geometry | undefined {
        const appState = this.props.appState
        if (!this.props.userId || appState.homeHexalot || !appState.islandIsLegal) {
            return undefined
        }
        const geometry = new Geometry()
        const island = appState.island
        if (island) {
            const vacantHexalot = island.vacantHexalot
            island.spots.filter(spot => spot.isCandidateHexalot(vacantHexalot)).forEach(spot => {
                spot.addRaisedHexagon(geometry.vertices, HEXALOT_OUTLINE_HEIGHT)
            })
        }
        return geometry
    }

    private get vacantHexalotsGeometry(): Geometry | undefined {
        const appState = this.props.appState
        const island = appState.island
        if (!island) {
            return undefined
        }
        const vacantHexalot = island.vacantHexalot
        if (!vacantHexalot) {
            return undefined
        }
        const geometry = new Geometry()
        vacantHexalot.centerSpot.addRaisedHexagon(geometry.vertices, HEXALOT_OUTLINE_HEIGHT)
        vacantHexalot.spots.forEach((spot, index) => {
            const outerIndex = index - INNER_HEXALOT_SPOTS
            if (outerIndex < 0) {
                return
            }
            spot.addRaisedHexagonParts(geometry.vertices, HEXALOT_OUTLINE_HEIGHT, outerIndex, OUTER_HEXALOT_SIDE)
        })
        return geometry
    }

    public get activeHexalotId(): string | undefined {
        const appState = this.props.appState
        if (appState.jockey) {
            return appState.jockey.gotchi.home.id
        }
        if (appState.gotchi) {
            return appState.gotchi.home.id
        }
        if (appState.evolution) {
            return appState.evolution.home.id
        }
        return undefined
    }

    private disposeGeometry(): void {
        this.spots.dispose()
        this.seeds.dispose()
        this.occupiedHangers.dispose()
        this.vacantHangers.dispose()
        if (this.homeHexalot) {
            this.homeHexalot.dispose()
        }
        if (this.selectedSpot) {
            this.selectedSpot.dispose()
        }
        if (this.availableSpots) {
            this.availableSpots.dispose()
        }
        if (this.vacantHexalots) {
            this.vacantHexalots.dispose()
        }
    }
}
