import * as React from "react"
import * as R3 from "react-three"
import {Subscription} from "rxjs/Subscription"
import {Geometry, Mesh} from "three"

import {Island, IslandState} from "../island/island"
import {equals, IViewState} from "../island/spot"

import {GOTCHI_MATERIAL, HANGER_MATERIAL, ISLAND_MATERIAL} from "./materials"
import {MeshKey} from "./spot-selector"

export interface IslandComponentProps {
    island: Island
    master?: string
    setMesh: (key: string, ref: Mesh) => void
}

export interface IslandComponentState {
    spotsGeometry: Geometry
    seedGeometry: Geometry
    hangersGeometry: Geometry
}

export const dispose = (state: IslandComponentState) => {
    state.spotsGeometry.dispose()
    state.seedGeometry.dispose()
    state.hangersGeometry.dispose()
}

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private subscription?: Subscription

    constructor(props: IslandComponentProps) {
        super(props)
        this.state = {
            spotsGeometry: this.createSpotsGeometry({gotchiAlive: false}),
            seedGeometry: this.createSeedGeometry({gotchiAlive: false}),
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
                    key="Hangers"
                    geometry={this.state.hangersGeometry}
                    material={HANGER_MATERIAL}
                />
            </R3.Object3D>
        )
    }

    private createSpotsGeometry(islandState: IslandState): Geometry {
        const island = this.props.island
        const viewState: IViewState = {
            islandIsLegal: island.isLegal,
            freeHexalot: island.freeHexalot,
            master: this.props.master,
        }
        const geometry = new Geometry()
        if (islandState.selectedHexalot) {
            islandState.selectedHexalot.spots.forEach((spot, index) => {
                spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces, viewState)
            })
        } else {
            island.spots.forEach((spot, index) => {
                spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces, viewState)
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
            if (!islandState.gotchiAlive || !islandState.selectedHexalot
                || !equals(hexalot.coords, islandState.selectedHexalot.coords)) {
                hexalot.centerSpot.addSeed(MeshKey.SEEDS_KEY, geometry.vertices, geometry.faces)
            }
        })
        geometry.computeFaceNormals()
        geometry.computeBoundingSphere()
        return geometry
    }
}
