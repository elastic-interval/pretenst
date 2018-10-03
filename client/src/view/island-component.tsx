import * as React from 'react';
import * as R3 from 'react-three';
import {Geometry, Mesh} from 'three';
import {Island, IslandChange} from '../island/island';
import {Spot} from '../island/spot';
import {FOREIGN_HANGER_MATERIAL, ISLAND_MATERIAL} from './materials';
import {Gotch} from '../island/gotch';
import {Subscription} from 'rxjs/Subscription';

export interface IslandComponentProps {
    island: Island;
    setMesh: (key: string, ref: Mesh) => void;
}

export interface IslandComponentState {
    fixedSpotsGeometry: Geometry;
    freeSpotsGeometry: Geometry;
    foreignHangers: Geometry;
}

export const dispose = (state: IslandComponentState) => {
    state.fixedSpotsGeometry.dispose();
    state.freeSpotsGeometry.dispose();
    state.foreignHangers.dispose();
};

const FIXED_SPOTS = 'FixedSpots';
const FREE_SPOTS = 'FreeSpots';

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private islandSubscription?: Subscription;

    constructor(props: IslandComponentProps) {
        super(props);
        const spots = this.props.island.spots;
        this.state = {
            fixedSpotsGeometry: this.getSpotsGeometry(FIXED_SPOTS, spots, 1),
            freeSpotsGeometry: this.getSpotsGeometry(FREE_SPOTS, [], 1),
            foreignHangers: this.getHangersGeometry(this.props.island.gotches)
        };
    }

    public componentWillMount() {
        if (!this.islandSubscription) {
            this.islandSubscription = this.props.island.islandChange.subscribe((change: IslandChange) => {
                this.refreshState(change.masterGotch);
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
                    geometry={this.state.fixedSpotsGeometry}
                    ref={(mesh: Mesh) => this.props.setMesh(FIXED_SPOTS, mesh)}
                    material={ISLAND_MATERIAL}
                />
                <R3.Mesh
                    name={FREE_SPOTS}
                    geometry={this.state.freeSpotsGeometry}
                    material={ISLAND_MATERIAL}
                    ref={(mesh: Mesh) => this.props.setMesh(FREE_SPOTS, mesh)}
                />
                <R3.LineSegments
                    key="ForeignHangers"
                    geometry={this.state.foreignHangers}
                    material={FOREIGN_HANGER_MATERIAL}
                />
            </R3.Object3D>
        );
    }

    private refreshState(masterGotch?: Gotch) {
        const spots = this.props.island.spots;
        const gotches = this.props.island.gotches;
        if (masterGotch) {
            this.setState((state: IslandComponentState) => {
                dispose(state);
                return {
                    fixedSpotsGeometry: this.getSpotsGeometry(FIXED_SPOTS, spots, 1),
                    freeSpotsGeometry: this.getSpotsGeometry(FREE_SPOTS, [], 1),
                    foreignHangers: this.getHangersGeometry(gotches)
                };
            });
        } else if (this.props.island.hasFreeGotch) {
            this.setState((state: IslandComponentState) => {
                dispose(state);
                return {
                    fixedSpotsGeometry: this.getSpotsGeometry(
                        FIXED_SPOTS,
                        spots.filter(spot => !spot.free),
                        0.1
                    ),
                    freeSpotsGeometry: this.getSpotsGeometry(
                        FREE_SPOTS,
                        spots.filter(spot => spot.free),
                        5
                    ),
                    foreignHangers: this.getHangersGeometry(gotches)
                };
            });
        } else {
            this.setState((state: IslandComponentState) => {
                dispose(state);
                return {
                    fixedSpotsGeometry: this.getSpotsGeometry(
                        FIXED_SPOTS,
                        spots.filter(spot => !spot.canBeNewGotch),
                        0.1
                    ),
                    freeSpotsGeometry: this.getSpotsGeometry(
                        FREE_SPOTS,
                        spots.filter(spot => spot.canBeNewGotch),
                        5
                    ),
                    foreignHangers: this.getHangersGeometry(gotches)
                };
            });
        }

    }

    private getSpotsGeometry(key: string, spots: Spot[], depth: number): Geometry {
        const geometry = new Geometry();
        spots.forEach((spot, index) => spot.addSurfaceGeometry(key, index, geometry.vertices, geometry.faces, depth));
        geometry.computeBoundingSphere();
        return geometry;
    }

    private getHangersGeometry(gotches: Gotch[]): Geometry {
        const geometry = new Geometry();
        gotches
            .filter(gotch => !!gotch.genome)
            .forEach(gotch => gotch.center.addHangerGeometry(geometry.vertices));
        geometry.computeBoundingSphere();
        return geometry;
    }
}
