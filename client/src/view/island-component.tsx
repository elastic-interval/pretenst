import * as React from 'react';
import * as R3 from 'react-three';
import {Geometry, Mesh} from 'three';
import {Island} from '../island/island';
import {FOREIGN_HANGER_MATERIAL, ISLAND_MATERIAL} from './materials';
import {Subscription} from 'rxjs/Subscription';

export interface IslandComponentProps {
    island: Island;
    setMesh: (key: string, ref: Mesh) => void;
}

export interface IslandComponentState {
    spotsGeometry: Geometry;
    hangersGeometry: Geometry;
}

export const dispose = (state: IslandComponentState) => {
    state.spotsGeometry.dispose();
    state.hangersGeometry.dispose();
};

const FIXED_SPOTS = 'FixedSpots';

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private islandSubscription?: Subscription;

    constructor(props: IslandComponentProps) {
        super(props);
        this.state = {
            spotsGeometry: this.spotsGeometry,
            hangersGeometry: this.hangersGeometry
        };
    }

    public componentWillMount() {
        if (!this.islandSubscription) {
            this.islandSubscription = this.props.island.islandChange.subscribe(() => {
                this.setState((state: IslandComponentState) => {
                    dispose(state);
                    return {
                        spotsGeometry: this.spotsGeometry,
                        hangersGeometry: this.hangersGeometry
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
                <R3.LineSegments
                    key="ForeignHangers"
                    geometry={this.state.hangersGeometry}
                    material={FOREIGN_HANGER_MATERIAL}
                />
            </R3.Object3D>
        );
    }

    private get spotsGeometry(): Geometry {
        const island = this.props.island;
        const spots = island.spots;
        const freeGotch = island.freeGotch;
        const masterGotch = island.masterGotch;
        const geometry = new Geometry();
        spots.forEach((spot, index) => {
            spot.addSurfaceGeometry(FIXED_SPOTS, index, geometry.vertices, geometry.faces, freeGotch, masterGotch);
        });
        geometry.computeBoundingSphere();
        return geometry;
    }

    private get hangersGeometry(): Geometry {
        const gotches = this.props.island.gotches;
        const geometry = new Geometry();
        gotches
            .filter(gotch => !!gotch.genome)
            .forEach(gotch => gotch.center.addHangerGeometry(geometry.vertices));
        geometry.computeBoundingSphere();
        return geometry;
    }
}
