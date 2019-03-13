import * as React from "react"
import * as R3 from "react-three"
import {Subscription} from "rxjs/Subscription"
import {Geometry, Matrix4, Mesh, Vector3} from "three"

import {HUNG_ALTITUDE} from "../body/fabric"
import {Island} from "../island/island"
import {IslandMode, IslandState} from "../island/island-state"
import {ARROW_LENGTH, ARROW_TIP_LENGTH_FACTOR, ARROW_TIP_WIDTH_FACTOR, ARROW_WIDTH} from "../island/shapes"
import {equals} from "../island/spot"

import {GOTCHI_MATERIAL, GOTCHI_POINTER_MATERIAL, HANGER_MATERIAL, ISLAND_MATERIAL} from "./materials"
import {MeshKey} from "./spot-selector"

export interface IslandComponentProps {
    island: Island
    setMesh: (key: string, ref: Mesh) => void
}

export interface IslandComponentState {
    spotsGeometry: Geometry
    seedGeometry: Geometry
    arrowGeometry: Geometry
    hangersGeometry: Geometry
}

export const dispose = (state: IslandComponentState) => {
    state.spotsGeometry.dispose()
    state.seedGeometry.dispose()
    state.arrowGeometry.dispose()
    state.hangersGeometry.dispose()
}

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private subscription?: Subscription

    constructor(props: IslandComponentProps) {
        super(props)
        const islandState = props.island.islandState.getValue()
        this.state = {
            spotsGeometry: this.createSpotsGeometry(islandState),
            seedGeometry: this.createSeedGeometry(islandState),
            arrowGeometry: this.createArrowGeometry(islandState),
            hangersGeometry: this.createHangersGeometry(),
        }
    }

    public componentWillMount(): void {
        if (!this.subscription) {
            this.subscription = this.props.island.islandState.subscribe((islandState: IslandState) => {
                this.props.island.spots.forEach(spot => spot.faceNames = [])
                this.setState((state: IslandComponentState) => {
                    dispose(state)
                    return {
                        spotsGeometry: this.createSpotsGeometry(islandState),
                        seedGeometry: this.createSeedGeometry(islandState),
                        arrowGeometry: this.createArrowGeometry(islandState),
                        hangersGeometry: this.createHangersGeometry(),
                    }
                })
            })
        }
    }

    public componentWillUnmount(): void {
        if (this.subscription) {
            this.subscription.unsubscribe()
        }
        dispose(this.state)
    }

    public render(): JSX.Element {
        return (
            <R3.Object3D key={this.context.key}>
                <R3.Mesh
                    name="Spots"
                    geometry={this.state.spotsGeometry}
                    ref={(mesh: Mesh) => this.props.setMesh(MeshKey.SPOTS_KEY, mesh)}
                    material={ISLAND_MATERIAL}
                />
                <R3.Mesh
                    name="Seeds"
                    geometry={this.state.seedGeometry}
                    material={GOTCHI_MATERIAL}
                />
                <R3.LineSegments
                    key="Arrows"
                    geometry={this.state.arrowGeometry}
                    material={GOTCHI_POINTER_MATERIAL}
                />
                <R3.LineSegments
                    key="Hangers"
                    geometry={this.state.hangersGeometry}
                    material={HANGER_MATERIAL}
                />
            </R3.Object3D>
        )
    }

    private createSpotsGeometry(islandState: IslandState): Geometry {
        const island = this.props.island
        const geometry = new Geometry()
        if (islandState.selectedHexalot) {
            islandState.selectedHexalot.spots.forEach((spot, index) => {
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

    private createHangersGeometry(): Geometry {
        const hexalots = this.props.island.hexalots
        const geometry = new Geometry()
        hexalots.forEach(hexalot => hexalot.centerSpot.addHangerGeometry(geometry.vertices))
        geometry.computeBoundingSphere()
        return geometry
    }

    private createSeedGeometry(islandState: IslandState): Geometry {
        const hexalots = this.props.island.hexalotsWithSeeds
        const geometry = new Geometry()
        hexalots.forEach(hexalot => {
            if (
                islandState.islandMode === IslandMode.Landed || islandState.islandMode === IslandMode.Visiting ||
                !islandState.selectedHexalot ||
                !equals(hexalot.coords, islandState.selectedHexalot.coords)
            ) {
                hexalot.centerSpot.addSeed(hexalot.rotation, MeshKey.SEEDS_KEY, geometry.vertices, geometry.faces)
            }
        })
        geometry.computeFaceNormals()
        geometry.computeBoundingSphere()
        return geometry
    }

    private createArrowGeometry(islandState: IslandState): Geometry {
        const geometry = new Geometry()
        const hexalot = islandState.selectedHexalot
        if (!hexalot || islandState.islandMode !== IslandMode.Landed) {
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
}
