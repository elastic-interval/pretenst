/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { Color, Geometry, Matrix4, Mesh, Vector3 } from "three"

import { HUNG_ALTITUDE } from "../body/fabric"
import {
    ARROW_LENGTH,
    ARROW_TIP_LENGTH_FACTOR,
    ARROW_TIP_WIDTH_FACTOR,
    ARROW_WIDTH,
    HEXALOT_OUTLINE_HEIGHT,
    INNER_HEXALOT_SPOTS,
    OUTER_HEXALOT_SIDE,
} from "../island/constants"
import { IAppState, Mode } from "../state/app-state"

import {
    AVAILABLE_HEXALOT,
    GOTCHI,
    GOTCHI_ARROW,
    HANGER_FREE,
    HANGER_OCCUPIED,
    HOME_HEXALOT,
    ISLAND,
    SELECTED_POINTER,
} from "./materials"
import { MeshKey } from "./spot-selector"

const SUN_POSITION = new Vector3(0, 400, 0)
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8)

export interface IslandComponentProps {
    appState: IAppState
    setMesh: (key: string, ref: Mesh) => void
}

export class IslandComponent extends React.Component<IslandComponentProps, object> {
    private appStateNonce = 0
    private spots: Geometry
    private seeds: Geometry
    private occupiedHangers: Geometry
    private vacantHangers: Geometry
    private arrow?: Geometry
    private homeHexalot?: Geometry
    private selectedSpot?: Geometry
    private availableSpots?: Geometry
    private vacantHexalots?: Geometry

    constructor(props: IslandComponentProps) {
        super(props)
        this.spots = this.spotsGeometry
        this.seeds = this.seedsGeometry
        this.arrow = this.arrowGeometry
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

    public render(): JSX.Element {
        const appState = this.props.appState
        if (appState.nonce > this.appStateNonce) {
            this.disposeGeometry()
            appState.island.spots.forEach(spot => spot.faceNames = [])
            this.spots = this.spotsGeometry
            this.seeds = this.seedsGeometry
            this.arrow = this.arrowGeometry
            this.occupiedHangers = this.occupiedHangersGeometry
            this.vacantHangers = this.vacantHangersGeometry
            this.selectedSpot = this.selectedSpotGeometry
            this.homeHexalot = this.homeHexalotGeometry
            this.availableSpots = this.availableSpotsGeometry
            this.vacantHexalots = this.vacantHexalotsGeometry
            this.appStateNonce = appState.nonce
        }
        return (
            <R3.Object3D key={appState.island.name}>
                <R3.Mesh name="Spots" geometry={this.spots} material={ISLAND}
                         ref={(mesh: Mesh) => this.props.setMesh(MeshKey.SPOTS_KEY, mesh)}
                />
                <R3.Mesh name="Seeds" geometry={this.seeds} material={GOTCHI}/>
                <R3.LineSegments key="HangersOccupied" geometry={this.occupiedHangers} material={HANGER_OCCUPIED}/>
                <R3.LineSegments key="HangersFree" geometry={this.vacantHangers} material={HANGER_FREE}/>
                {!this.homeHexalot ? undefined : (
                    <R3.LineSegments key="HomeHexalot" geometry={this.homeHexalot} material={HOME_HEXALOT}/>
                )}
                {!this.arrow ? undefined : (
                    <R3.LineSegments key="Arrow" geometry={this.arrow} material={GOTCHI_ARROW}/>
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
        const appState = this.props.appState
        const geometry = new Geometry()
        appState.island.spots.forEach((spot, index) => {
            spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces)
        })
        geometry.computeBoundingSphere()
        return geometry
    }

    private get occupiedHangersGeometry(): Geometry {
        const vacantHexalot = this.props.appState.island.vacantHexalot
        const geometry = new Geometry()
        this.props.appState.island.hexalots.forEach(hexalot => {
            if (vacantHexalot && vacantHexalot.id === hexalot.id) {
                return
            }
            hexalot.centerSpot.addHangerGeometry(geometry.vertices)
        })
        return geometry
    }

    private get vacantHangersGeometry(): Geometry {
        const vacantHexalot = this.props.appState.island.vacantHexalot
        const geometry = new Geometry()
        if (vacantHexalot) {
            vacantHexalot.centerSpot.addHangerGeometry(geometry.vertices)
        }
        return geometry
    }

    private get seedsGeometry(): Geometry {
        const geometry = new Geometry()
        const hexalots = this.props.appState.island.hexalots
        const activeHexalotId = this.activeHexalotId
        hexalots.forEach(hexalot => {
            if (!activeHexalotId || hexalot.id !== activeHexalotId) {
                hexalot.centerSpot.addSeed(hexalot.rotation, MeshKey.SEEDS_KEY, geometry.vertices, geometry.faces)
            }
        })
        geometry.computeFaceNormals()
        geometry.computeBoundingSphere()
        return geometry
    }

    private get arrowGeometry(): Geometry | undefined {
        const appState = this.props.appState
        const hexalot = appState.selectedHexalot
        if (!hexalot || appState.mode !== Mode.PreparingDrive) {
            return undefined
        }
        const toTransform: Vector3[] = []
        const v = () => {
            const vec = new Vector3()
            toTransform.push(vec)
            return vec
        }
        const adjacentSpot = hexalot.spots[4]
        const forward = new Vector3().subVectors(adjacentSpot.center, hexalot.center).normalize()
        const right = new Vector3().add(forward).applyMatrix4(new Matrix4().makeRotationY(Math.PI / 2))
        const arrowFromL = v().addScaledVector(right, -ARROW_WIDTH)
        const arrowFromR = v().addScaledVector(right, ARROW_WIDTH)
        const arrowToL = v().addScaledVector(right, -ARROW_WIDTH).addScaledVector(forward, ARROW_LENGTH)
        const arrowToR = v().addScaledVector(right, ARROW_WIDTH).addScaledVector(forward, ARROW_LENGTH)
        const arrowToLx = v().addScaledVector(right, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(forward, ARROW_LENGTH)
        const arrowToRx = v().addScaledVector(right, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(forward, ARROW_LENGTH)
        const arrowTip = v().addScaledVector(forward, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
        const rotationMatrix = new Matrix4().makeRotationY(Math.PI / 3 * hexalot.rotation)
        const translationMatrix = new Matrix4().makeTranslation(hexalot.center.x, hexalot.center.y + HUNG_ALTITUDE, hexalot.center.z)
        const transformer = translationMatrix.multiply(rotationMatrix)
        toTransform.forEach(point => point.applyMatrix4(transformer))
        const geometry = new Geometry()
        geometry.vertices = [
            arrowFromL, arrowToL, arrowFromR, arrowToR,
            arrowToRx, arrowTip, arrowToLx, arrowTip,
            arrowToRx, arrowToR, arrowToLx, arrowToL,
        ]
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
        geometry.vertices = [target, new Vector3().addVectors(target, SUN_POSITION)]
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
        if (appState.mode !== Mode.Visiting || !appState.islandIsLegal) {
            return undefined
        }
        const vacantHexalot = appState.island.vacantHexalot
        const geometry = new Geometry()
        appState.island.spots.filter(spot => spot.isCandidateHexalot(vacantHexalot)).forEach(spot => {
            spot.addRaisedHexagon(geometry.vertices, HEXALOT_OUTLINE_HEIGHT)
        })
        return geometry
    }

    private get vacantHexalotsGeometry(): Geometry | undefined {
        const appState = this.props.appState
        const vacantHexalot = appState.island.vacantHexalot
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
        const state = this.props.appState
        if (state.gotchi) {
            return state.gotchi.home.id
        }
        if (state.evolution) {
            return state.evolution.home.id
        }
        return undefined
    }

    private disposeGeometry(): void {
        this.spots.dispose()
        this.seeds.dispose()
        this.occupiedHangers.dispose()
        this.vacantHangers.dispose()
        if (this.arrow) {
            this.arrow.dispose()
        }
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
