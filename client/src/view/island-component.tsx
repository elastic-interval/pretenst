import * as React from 'react';
import * as R3 from 'react-three';
import {Geometry} from 'three';
import {Island} from '../island/island';
import {equals, ISpotContext, Spot} from '../island/spot';
import {FOREIGN_HANGER_MATERIAL, ISLAND_MATERIAL} from './materials';
import {Gotch} from '../island/gotch';

export interface IslandComponentProps {
    island: Island;
    master: string;
}

export interface IslandComponentState {
    masterGotch?: Gotch;
}

export class IslandComponent extends React.Component<IslandComponentProps, IslandComponentState> {

    private fixedSpotsGeometry: Geometry;
    private freeSpotsGeometry: Geometry;
    private foreignHangers: Geometry;

    constructor(props: IslandComponentProps) {
        super(props);
        this.state = {
            masterGotch: props.island.findGotch(props.master)
        };
    }

    public render() {
        // TODO: Do all this putting the geometries in the state!
        if (this.fixedSpotsGeometry) {
            this.fixedSpotsGeometry.dispose();
        }
        if (this.freeSpotsGeometry) {
            this.freeSpotsGeometry.dispose();
        }
        const spots = this.props.island.spots;
        const masterGotch = this.state.masterGotch;
        if (masterGotch) {
            this.fixedSpotsGeometry = this.getSpotsGeometry(
                spots.filter(spot => {
                    return !!spot.memberOfGotch.find(gotch => equals(gotch.coords, masterGotch.coords));
                }),
                1
            );
            this.freeSpotsGeometry = this.getSpotsGeometry(
                spots.filter(spot => {
                    return !spot.memberOfGotch.find(gotch => equals(gotch.coords, masterGotch.coords));
                }),
                0.1
            );
        } else {
            this.fixedSpotsGeometry = this.getSpotsGeometry(
                spots.filter(spot => !spot.canBeNewGotch),
                0.1
            );
            this.freeSpotsGeometry = this.getSpotsGeometry(
                spots.filter(spot => spot.canBeNewGotch),
                5
            );
        }
        if (this.foreignHangers) {
            this.foreignHangers.dispose();
        }
        this.foreignHangers = this.getHangersGeometry(
            this.props.island.gotches
                .filter(gotch => gotch.master && gotch.master !== this.props.master)
        );
        // TODO: there is competition for facesMeshNode!
        return (
            <R3.Object3D key="Island">
                <R3.Mesh
                    key="FixedSpots"
                    geometry={this.fixedSpotsGeometry}
                    ref={(node: any) => this.props.island.facesMeshNode = node}
                    material={ISLAND_MATERIAL}
                />
                <R3.Mesh
                    key="FreeSpots"
                    geometry={this.freeSpotsGeometry}
                    ref={(node: any) => this.props.island.facesMeshNode = node}
                    material={ISLAND_MATERIAL}
                />
                <R3.LineSegments
                    key="ForeignHangers"
                    geometry={this.foreignHangers}
                    material={FOREIGN_HANGER_MATERIAL}
                />
            </R3.Object3D>
        );
    }

    private getSpotsGeometry(spots: Spot[], depth: number): Geometry {
        const spotContext: ISpotContext = {
            faces: [],
            vertices: [],
            master: this.props.master
        };
        spots.forEach((spot, index) => spot.addSurfaceGeometry(index, spotContext, depth));
        const geometry = new Geometry();
        geometry.vertices = spotContext.vertices;
        geometry.faces = spotContext.faces;
        geometry.computeBoundingSphere();
        return geometry;
    }

    private getHangersGeometry(gotches: Gotch[]): Geometry {
        const spotContext: ISpotContext = {
            faces: [],
            vertices: [],
            master: this.props.master
        };
        gotches
            .filter(gotch => !!gotch.genome)
            .forEach(gotch => gotch.center.addHangerGeometry(spotContext));
        const geometry = new Geometry();
        geometry.vertices = spotContext.vertices;
        geometry.computeBoundingSphere();
        return geometry;
    }
}
