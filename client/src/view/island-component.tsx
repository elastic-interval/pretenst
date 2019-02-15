import * as React from 'react';
import * as R3 from 'react-three';
import {Subscription} from 'rxjs/Subscription';
import {Geometry, Mesh} from 'three';
import {Island} from '../island/island';
import {IViewState} from '../island/spot';
import {FOREIGN_HANGER_MATERIAL, GOTCHI_MATERIAL, HOME_HANGER_MATERIAL, ISLAND_MATERIAL} from './materials';
import {MeshKey} from './spot-selector';

export interface IslandComponentProps {
    island: Island;
    master?: string;
    setMesh: (key: string, ref: Mesh) => void;
}

export interface IslandComponentState {
    spotsGeometry: Geometry;
    foreignSeedGeometry: Geometry;
    foreignHangersGeometry: Geometry;
    homeSeedGeometry: Geometry;
    homeHangersGeometry: Geometry;
}

export const dispose = (state: IslandComponentState) => {
    state.spotsGeometry.dispose();
    state.foreignSeedGeometry.dispose();
    state.foreignHangersGeometry.dispose();
    state.homeSeedGeometry.dispose();
    state.homeHangersGeometry.dispose();
};

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private islandSubscription?: Subscription;

    constructor(props: IslandComponentProps) {
        super(props);
        this.state = {
            spotsGeometry: this.spotsGeometry,
            foreignSeedGeometry: this.createSeedGeometry(true),
            foreignHangersGeometry: this.createHangersGeometry(true),
            homeSeedGeometry: this.createSeedGeometry(false),
            homeHangersGeometry: this.createHangersGeometry(false),
        };
    }

    public componentWillMount() {
        if (!this.islandSubscription) {
            this.islandSubscription = this.props.island.islandState.subscribe(() => {
                this.setState((state: IslandComponentState) => {
                    dispose(state);
                    return {
                        spotsGeometry: this.spotsGeometry,
                        foreignSeedGeometry: this.createSeedGeometry(true),
                        foreignHangersGeometry: this.createHangersGeometry(true),
                        homeSeedGeometry: this.createSeedGeometry(false),
                        homeHangersGeometry: this.createHangersGeometry(false),
                    };
                });
            });
        }
    }

    public componentWillUnmount() {
        if (this.islandSubscription) {
            this.islandSubscription.unsubscribe();
        }
        dispose(this.state);
    }

    public render() {
        return (
            <R3.Object3D key={this.context.key}>
                <R3.Mesh
                    name="spots"
                    geometry={this.state.spotsGeometry}
                    ref={(mesh: Mesh) => this.props.setMesh(MeshKey.SPOTS_KEY, mesh)}
                    material={ISLAND_MATERIAL}
                />
                <R3.Mesh
                    name="ForeignSeeds"
                    geometry={this.state.foreignSeedGeometry}
                    material={GOTCHI_MATERIAL}
                />
                <R3.Mesh
                    name="HomeSeed"
                    geometry={this.state.homeSeedGeometry}
                    material={GOTCHI_MATERIAL}
                />
                <R3.LineSegments
                    key="ForeignHangers"
                    geometry={this.state.foreignHangersGeometry}
                    material={FOREIGN_HANGER_MATERIAL}
                />
                <R3.LineSegments
                    key="HomeHanger"
                    geometry={this.state.homeHangersGeometry}
                    material={HOME_HANGER_MATERIAL}
                />
            </R3.Object3D>
        );
    }

    private get spotsGeometry(): Geometry {
        const island = this.props.island;
        const viewState: IViewState = {
            islandIsLegal: island.isLegal,
            freeHexalot: island.freeHexalot,
            master: this.props.master,
        };
        const geometry = new Geometry();
        island.spots.forEach((spot, index) => {
            spot.addSurfaceGeometry(MeshKey.SPOTS_KEY, index, geometry.vertices, geometry.faces, viewState);
        });
        geometry.computeBoundingSphere();
        return geometry;
    }

    private createHangersGeometry(foreign: boolean): Geometry {
        const hexalots = this.props.island.hexalots;
        const geometry = new Geometry();
        hexalots.forEach(hexalot => hexalot.centerSpot.addHangerGeometry(geometry.vertices));
        geometry.computeBoundingSphere();
        return geometry;
    }

    private createSeedGeometry(foreign: boolean): Geometry {
        const hexalots = this.props.island.hexalotsWithSeeds;
        const geometry = new Geometry();
        if (foreign) {
            hexalots.forEach(hexalot => hexalot.centerSpot.addSeed(MeshKey.SEEDS_KEY, geometry.vertices, geometry.faces));
            geometry.computeFaceNormals();
            geometry.computeBoundingSphere();
        }
        return geometry;
    }
}
