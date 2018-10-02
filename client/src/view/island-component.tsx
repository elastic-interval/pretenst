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

const FIXED_SPOTS = 'FixedSpots';
const FREE_SPOTS = 'FreeSpots';

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {
    private subscription: Subscription;

    constructor(props: IslandComponentProps) {
        super(props);
        const spots = this.props.island.spots;
        this.state = {
            fixedSpotsGeometry: this.getSpotsGeometry(FIXED_SPOTS, spots, 1),
            freeSpotsGeometry: this.getSpotsGeometry(FREE_SPOTS, [], 1),
            foreignHangers: this.getHangersGeometry(this.props.island.gotches)
        };
    }

    public componentDidUpdate() {
        // this.refresh();
    }

    public componentDidMount() {
        this.subscription = this.props.island.islandChange.subscribe((change: IslandChange) => this.refresh(change.masterGotch));
    }

    public componentWillUnmount() {
        this.subscription.unsubscribe();
        this.dispose();
    }

    public render() {
        return (
            <R3.Object3D key="Island">
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

    private refresh(masterGotch?: Gotch) {
        const spots = this.props.island.spots;
        const gotches = this.props.island.gotches;
        if (masterGotch) {
            this.setState((state: IslandComponentState) => {
                this.dispose();
                return {
                    fixedSpotsGeometry: this.getSpotsGeometry(FIXED_SPOTS, spots, 1),
                    freeSpotsGeometry: this.getSpotsGeometry(FREE_SPOTS, [], 1),
                    foreignHangers: this.getHangersGeometry(gotches)
                };
            });
        } else {
            this.setState((state: IslandComponentState) => {
                this.dispose();
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

    private dispose() {
        this.state.fixedSpotsGeometry.dispose();
        this.state.freeSpotsGeometry.dispose();
        this.state.foreignHangers.dispose();
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
