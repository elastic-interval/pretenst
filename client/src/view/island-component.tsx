import * as React from "react"
import * as R3 from "react-three"
import {Color, Geometry, Matrix4, Mesh, Vector3} from "three"

import {HUNG_ALTITUDE} from "../body/fabric"
import {IslandMode, IslandState} from "../island/island-state"
import {
    ARROW_LENGTH,
    ARROW_TIP_LENGTH_FACTOR,
    ARROW_TIP_WIDTH_FACTOR,
    ARROW_WIDTH,
    HEXALOT_OUTLINE_HEIGHT,
    INNER_HEXALOT_SPOTS,
    OUTER_HEXALOT_SIDE,
} from "../island/shapes"

import {GOTCHI, GOTCHI_ARROW, HANGER_FREE, HANGER_OCCUPIED, HOME_HEXALOT, ISLAND, SELECTED_POINTER} from "./materials"
import {MeshKey} from "./spot-selector"

const SUN_POSITION = new Vector3(0, 400, 0)
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8)

export interface IslandComponentProps {
    islandState: IslandState
    setMesh: (key: string, ref: Mesh) => void
}

export class IslandComponent extends React.Component<IslandComponentProps, object> {
    private islandStateNonce = 0
    private spots: Geometry
    private seeds: Geometry
    private hangersOccupied: Geometry
    private hangersFree: Geometry
    private arrow?: Geometry
    private homeHexalot?: Geometry
    private selectedSpot?: Geometry

    constructor(props: IslandComponentProps) {
        super(props)
        this.spots = this.spotsGeometry
        this.seeds = this.seedsGeometry
        this.arrow = this.arrowGeometry
        this.hangersOccupied = this.hangersGeometry(true)
        this.hangersFree = this.hangersGeometry(false)
        this.selectedSpot = this.selectedSpotGeometry
        this.homeHexalot = this.homeHexalotGeometry
    }

    public componentWillUnmount(): void {
        this.disposeGeometry()
    }

    public render(): JSX.Element {
        const islandState = this.props.islandState
        if (islandState.nonce > this.islandStateNonce) {
            this.disposeGeometry()
            islandState.island.spots.forEach(spot => spot.faceNames = [])
            this.spots = this.spotsGeometry
            this.seeds = this.seedsGeometry
            this.arrow = this.arrowGeometry
            this.hangersOccupied = this.hangersGeometry(true)
            this.hangersFree = this.hangersGeometry(false)
            this.selectedSpot = this.selectedSpotGeometry
            this.homeHexalot = this.homeHexalotGeometry
            this.islandStateNonce = islandState.nonce
        }
        return (
            <R3.Object3D key={this.context.key}>
                <R3.Mesh name="Spots" geometry={this.spots} material={ISLAND}
                         ref={(mesh: Mesh) => this.props.setMesh(MeshKey.SPOTS_KEY, mesh)}
                />
                <R3.Mesh name="Seeds" geometry={this.seeds} material={GOTCHI}/>
                <R3.LineSegments key="HangersOccupied" geometry={this.hangersOccupied} material={HANGER_OCCUPIED}/>
                <R3.LineSegments key="HangersFree" geometry={this.hangersFree} material={HANGER_FREE}/>
                {!this.homeHexalot ? null : (
                    <R3.LineSegments key="HomeHexalot" geometry={this.homeHexalot} material={HOME_HEXALOT}/>
                )}
                {!this.arrow ? null : (
                    <R3.LineSegments key="Arrow" geometry={this.arrow} material={GOTCHI_ARROW}/>
                )}
                {!this.selectedSpot ? null : (
                    <R3.LineSegments key="Pointer" geometry={this.selectedSpot} material={SELECTED_POINTER}/>
                )}
                <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
            </R3.Object3D>
        )
    }

    // =================================================================================================================

    private get spotsGeometry(): Geometry {
        const islandState = this.props.islandState
        const geometry = new Geometry()
        islandState.island.spots.forEach((spot, index) => {
            spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces)
        })
        geometry.computeBoundingSphere()
        return geometry
    }

    private hangersGeometry(occupied: boolean): Geometry {
        const homeHexalot = this.props.islandState.homeHexalot
        const hexalots = this.props.islandState.island.hexalots.filter(hexalot => {
            if (homeHexalot && hexalot.id === homeHexalot.id) {
                return false
            }
            return hexalot.occupied === occupied
        })
        const geometry = new Geometry()
        hexalots.forEach(hexalot => hexalot.centerSpot.addHangerGeometry(geometry.vertices))
        geometry.computeBoundingSphere()
        return geometry
    }

    private get seedsGeometry(): Geometry {
        const geometry = new Geometry()
        const hexalots = this.props.islandState.island.hexalots
        hexalots.filter(hexalot => hexalot.occupied).forEach(hexalot => {
            hexalot.centerSpot.addSeed(hexalot.rotation, MeshKey.SEEDS_KEY, geometry.vertices, geometry.faces)
        })
        geometry.computeFaceNormals()
        geometry.computeBoundingSphere()
        return geometry
    }

    private get arrowGeometry(): Geometry | undefined {
        const islandState = this.props.islandState
        const hexalot = islandState.selectedHexalot
        if (!hexalot || islandState.islandMode !== IslandMode.PlanningDrive) {
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
        const selectedSpot = this.props.islandState.selectedSpot
        if (!selectedSpot) {
            return undefined
        }
        const centerOfHexalot = selectedSpot.centerOfHexalot
        const geometry = new Geometry()
        const center = selectedSpot.center
        const occupiedHexalot = centerOfHexalot && centerOfHexalot.occupied
        const target = occupiedHexalot ? new Vector3(0, HUNG_ALTITUDE, 0).add(center) : center
        geometry.vertices = [target, new Vector3().addVectors(target, SUN_POSITION)]
        return geometry
    }

    private get homeHexalotGeometry(): Geometry | undefined {
        const homeHexalot = this.props.islandState.homeHexalot
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

    private disposeGeometry(): void {
        this.spots.dispose()
        this.seeds.dispose()
        this.hangersOccupied.dispose()
        this.hangersFree.dispose()
        if (this.arrow) {
            this.arrow.dispose()
        }
        if (this.homeHexalot) {
            this.homeHexalot.dispose()
        }
        if (this.selectedSpot) {
            this.selectedSpot.dispose()
        }
    }
}
