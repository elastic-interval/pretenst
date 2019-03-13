import * as React from "react"
import * as R3 from "react-three"
import {Subscription} from "rxjs/Subscription"
import {Geometry, Matrix4, Mesh, Vector3} from "three"

import {HUNG_ALTITUDE} from "../body/fabric"
import {Island} from "../island/island"
import {IslandMode, IslandState} from "../island/island-state"
import {ARROW_LENGTH, ARROW_TIP_LENGTH_FACTOR, ARROW_TIP_WIDTH_FACTOR, ARROW_WIDTH} from "../island/shapes"

import {GOTCHI_MATERIAL, GOTCHI_POINTER_MATERIAL, HANGER_MATERIAL, ISLAND_MATERIAL} from "./materials"
import {MeshKey} from "./spot-selector"

export interface IslandComponentProps {
    island: Island
    setMesh: (key: string, ref: Mesh) => void
}

export interface IslandComponentState {
    islandState: IslandState
}

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private subscription?: Subscription
    private spots: Geometry
    private seeds: Geometry
    private arrow: Geometry
    private hangers: Geometry

    constructor(props: IslandComponentProps) {
        super(props)
        const islandState = props.island.islandStateSubject.getValue()
        this.state = {islandState}
        this.spots = this.spotsGeometry
        this.seeds = this.seedsGeometry
        this.arrow = this.arrowGeometry
        this.hangers = this.hangersGeometry
    }

    public componentWillMount(): void {
        if (!this.subscription) {
            this.subscription = this.props.island.islandStateSubject.subscribe((islandState: IslandState) => {
                this.props.island.spots.forEach(spot => spot.faceNames = [])
                this.setState((state: IslandComponentState) => {
                    this.disposeGeometry()
                    this.spots = this.spotsGeometry
                    this.seeds = this.seedsGeometry
                    this.arrow = this.arrowGeometry
                    this.hangers = this.hangersGeometry
                    return {islandState}
                })
            })
        }
    }

    public componentWillUnmount(): void {
        if (this.subscription) {
            this.subscription.unsubscribe()
        }
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
        const island = this.props.island
        const geometry = new Geometry()
        const selectedHexalot = this.state.islandState.selectedHexalot
        if (selectedHexalot) {
            selectedHexalot.spots.forEach((spot, index) => {
                spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces)
            })
        } else {
            island.spots.forEach((spot, index) => {
                spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces)
            })
        }
        geometry.computeBoundingSphere()
        return geometry
    }

    private get hangersGeometry(): Geometry {
        const hexalots = this.props.island.hexalots
        const geometry = new Geometry()
        hexalots.forEach(hexalot => hexalot.centerSpot.addHangerGeometry(geometry.vertices))
        geometry.computeBoundingSphere()
        return geometry
    }

    private get seedsGeometry(): Geometry {
        const geometry = new Geometry()
        this.props.island.hexalots.filter(hexalot => hexalot.occupied).forEach(hexalot => {
            hexalot.centerSpot.addSeed(hexalot.rotation, MeshKey.SEEDS_KEY, geometry.vertices, geometry.faces)
        })
        geometry.computeFaceNormals()
        geometry.computeBoundingSphere()
        return geometry
    }

    private get arrowGeometry(): Geometry {
        const geometry = new Geometry()
        const islandState = this.state.islandState
        const hexalot = islandState.selectedHexalot
        if (!hexalot || islandState.islandMode !== IslandMode.Visiting) {
            return geometry
        }
        const toTransform: Vector3[] = []
        const v = () => {
            const vec = new Vector3()
            toTransform.push(vec)
            return vec
        }
        const forward = new Vector3().subVectors(hexalot.spots[4].center, hexalot.center).normalize()
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
