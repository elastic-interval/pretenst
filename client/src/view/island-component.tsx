import * as React from "react"
import * as R3 from "react-three"
import {Geometry, Matrix4, Mesh, Vector3} from "three"

import {HUNG_ALTITUDE} from "../body/fabric"
import {IslandMode, IslandState} from "../island/island-state"
import {ARROW_LENGTH, ARROW_TIP_LENGTH_FACTOR, ARROW_TIP_WIDTH_FACTOR, ARROW_WIDTH} from "../island/shapes"

import {GOTCHI_MATERIAL, GOTCHI_POINTER_MATERIAL, HANGER_MATERIAL, ISLAND_MATERIAL} from "./materials"
import {MeshKey} from "./spot-selector"

export interface IslandComponentProps {
    islandState: IslandState
    setMesh: (key: string, ref: Mesh) => void
}

export class IslandComponent extends React.Component<IslandComponentProps, object> {
    private spots: Geometry
    private seeds: Geometry
    private arrow: Geometry
    private hangers: Geometry

    constructor(props: IslandComponentProps) {
        super(props)
        this.spots = this.spotsGeometry
        this.seeds = this.seedsGeometry
        this.arrow = this.arrowGeometry
        this.hangers = this.hangersGeometry
    }

    public componentWillReceiveProps(nextProps: Readonly<IslandComponentProps>, nextContext: object): void {
        this.props.islandState.island.spots.forEach(spot => spot.faceNames = [])
        this.disposeGeometry()
        this.spots = this.spotsGeometry
        this.seeds = this.seedsGeometry
        this.arrow = this.arrowGeometry
        this.hangers = this.hangersGeometry
    }

    public componentWillUnmount(): void {
        this.disposeGeometry()
    }

    public render(): JSX.Element {
        return (
            <R3.Object3D key={this.context.key}>
                <R3.Mesh
                    name="Spots"
                    geometry={this.spots}
                    ref={(mesh: Mesh) => this.props.setMesh(MeshKey.SPOTS_KEY, mesh)}
                    material={ISLAND_MATERIAL}
                />
                <R3.Mesh
                    name="Seeds"
                    geometry={this.seeds}
                    material={GOTCHI_MATERIAL}
                />
                <R3.LineSegments
                    key="Arrows"
                    geometry={this.arrow}
                    material={GOTCHI_POINTER_MATERIAL}
                />
                <R3.LineSegments
                    key="Hangers"
                    geometry={this.hangers}
                    material={HANGER_MATERIAL}
                />
            </R3.Object3D>
        )
    }

    private get spotsGeometry(): Geometry {
        const islandState = this.props.islandState
        const geometry = new Geometry()
        const selectedHexalot = islandState.selectedHexalot
        if (selectedHexalot) {
            selectedHexalot.spots.forEach((spot, index) => {
                spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces)
            })
        } else {
            islandState.island.spots.forEach((spot, index) => {
                spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces)
            })
        }
        geometry.computeBoundingSphere()
        return geometry
    }

    private get hangersGeometry(): Geometry {
        const hexalots = this.props.islandState.island.hexalots
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

    private get arrowGeometry(): Geometry {
        const geometry = new Geometry()
        const islandState = this.props.islandState
        const homeHexalot = islandState.homeHexalot
        if (!homeHexalot || islandState.islandMode !== IslandMode.PlanningDrive) {
            return geometry
        }
        const toTransform: Vector3[] = []
        const v = () => {
            const vec = new Vector3()
            toTransform.push(vec)
            return vec
        }
        const adjacentSpot = homeHexalot.spots[4]
        const forward = new Vector3().subVectors(adjacentSpot.center, homeHexalot.center).normalize()
        const right = new Vector3().add(forward).applyMatrix4(new Matrix4().makeRotationY(Math.PI / 2))
        const arrowFromL = v().addScaledVector(right, -ARROW_WIDTH)
        const arrowFromR = v().addScaledVector(right, ARROW_WIDTH)
        const arrowToL = v().addScaledVector(right, -ARROW_WIDTH).addScaledVector(forward, ARROW_LENGTH)
        const arrowToR = v().addScaledVector(right, ARROW_WIDTH).addScaledVector(forward, ARROW_LENGTH)
        const arrowToLx = v().addScaledVector(right, -ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(forward, ARROW_LENGTH)
        const arrowToRx = v().addScaledVector(right, ARROW_WIDTH * ARROW_TIP_WIDTH_FACTOR).addScaledVector(forward, ARROW_LENGTH)
        const arrowTip = v().addScaledVector(forward, ARROW_LENGTH * ARROW_TIP_LENGTH_FACTOR)
        const rotationMatrix = new Matrix4().makeRotationY(Math.PI / 3 * homeHexalot.rotation)
        const translationMatrix = new Matrix4().makeTranslation(homeHexalot.center.x, homeHexalot.center.y + HUNG_ALTITUDE, homeHexalot.center.z)
        const transformer = translationMatrix.multiply(rotationMatrix)
        toTransform.forEach(point => point.applyMatrix4(transformer))
        geometry.vertices = [
            arrowFromL, arrowToL, arrowFromR, arrowToR,
            arrowToRx, arrowTip, arrowToLx, arrowTip,
            arrowToRx, arrowToR, arrowToLx, arrowToL,
        ]
        return geometry
    }

    private disposeGeometry(): void {
        this.spots.dispose()
        this.seeds.dispose()
        this.arrow.dispose()
        this.hangers.dispose()
    }
}
