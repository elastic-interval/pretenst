import * as React from 'react';
import * as R3 from 'react-three';
import {Geometry, Mesh} from 'three';
import {Island} from '../island/island';
import {FOREIGN_HANGER_MATERIAL, GOTCHI_MATERIAL, HOME_HANGER_MATERIAL, ISLAND_MATERIAL} from './materials';
import {Subscription} from 'rxjs/Subscription';
import {Gotch} from '../island/gotch';

export interface IslandComponentProps {
    island: Island;
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

const FIXED_SPOTS = 'FixedSpots';

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private islandSubscription?: Subscription;

    constructor(props: IslandComponentProps) {
        super(props);
        this.state = {
            spotsGeometry: this.spotsGeometry,
            foreignSeedGeometry: this.createSeedGeometry(true),
            foreignHangersGeometry: this.createHangersGeometry(true),
            homeSeedGeometry: this.createSeedGeometry(false),
            homeHangersGeometry: this.createHangersGeometry(false)
        };
    }

    public componentWillMount() {
        if (!this.islandSubscription) {
            this.islandSubscription = this.props.island.islandChange.subscribe(() => {
                this.setState((state: IslandComponentState) => {
                    dispose(state);
                    return {
                        spotsGeometry: this.spotsGeometry,
                        foreignSeedGeometry: this.createSeedGeometry(true),
                        foreignHangersGeometry: this.createHangersGeometry(true),
                        homeSeedGeometry: this.createSeedGeometry(false),
                        homeHangersGeometry: this.createHangersGeometry(false)
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
                    name={FIXED_SPOTS}
                    geometry={this.state.spotsGeometry}
                    ref={(mesh: Mesh) => this.props.setMesh(FIXED_SPOTS, mesh)}
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
        const spots = island.spots;
        const freeGotch = island.freeGotch;
        const masterGotch = island.masterGotch;
        const legal = island.legal;
        const geometry = new Geometry();
        spots.forEach((spot, index) => {
            spot.addSurfaceGeometry(
                FIXED_SPOTS,
                index,
                geometry.vertices,
                geometry.faces,
                legal,
                freeGotch,
                masterGotch
            );
        });
        geometry.computeBoundingSphere();
        return geometry;
    }

    private createHangersGeometry(foreign: boolean): Geometry {
        const gotches = this.props.island.gotches;
        const geometry = new Geometry();
        gotches
            .filter(gotch => foreign ? this.isForeignGotch(gotch) : this.isHomeGotch(gotch))
            .forEach(gotch => gotch.centerSpot.addHangerGeometry(geometry.vertices));
        geometry.computeBoundingSphere();
        return geometry;
    }

    private createSeedGeometry(foreign: boolean): Geometry {
        const gotches = this.props.island.gotches;
        const geometry = new Geometry();
        gotches
            .filter(gotch => foreign ? this.isForeignGotch(gotch) : this.isHomeGotch(gotch))
            .forEach(gotch => gotch.centerSpot.addSeed(geometry.vertices, geometry.faces));
        geometry.computeFaceNormals();
        geometry.computeBoundingSphere();
        return geometry;
    }

    private isHomeGotch(gotch: Gotch): boolean {
        return !!gotch.genome && gotch.genome.master === this.props.island.master;
    }

    private isForeignGotch(gotch: Gotch): boolean {
        return !!gotch.genome && gotch.genome.master !== this.props.island.master;
    }
}
