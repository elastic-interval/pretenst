import * as React from 'react';
import * as R3 from 'react-three';
import {Geometry} from 'three';
import {Island} from '../island/island';
import {ISpotContext} from '../island/spot';
import {HANGER_MATERIAL, ISLAND_MATERIAL} from './materials';

export interface IslandMeshProps {
    island: Island;
}

export interface IslandMeshState {
    editMode: boolean;
}

export class IslandComponent extends React.Component<IslandMeshProps, IslandMeshState> {

    private spotsGeometry: Geometry;
    private hangersGeometry: Geometry;

    constructor(props: IslandMeshProps) {
        super(props);
        this.state = {
            editMode: false
        };
    }

    public render() {
        if (this.spotsGeometry) {
            this.spotsGeometry.dispose();
        }
        this.spotsGeometry = this.spots;
        if (this.hangersGeometry) {
            this.hangersGeometry.dispose();
        }
        this.hangersGeometry = this.hangers;
        return <R3.Object3D key="Island">
            <R3.Mesh
                key="Spots"
                geometry={this.spotsGeometry}
                ref={(node: any) => this.props.island.facesMeshNode = node}
                material={ISLAND_MATERIAL}
            />
            <R3.LineSegments
                key="Hangers"
                geometry={this.hangersGeometry}
                material={HANGER_MATERIAL}
            />
        </R3.Object3D>;
    }

    private get spots(): Geometry {
        const spotContext: ISpotContext = {
            faces: [],
            vertices: [],
            owner: this.props.island.owner,
            singleGotch: this.props.island.gotches.length === 1
        };
        this.props.island.spots
            .forEach((spot, index) => spot.addSurfaceGeometry(index, spotContext));
        const geometry = new Geometry();
        geometry.vertices = spotContext.vertices;
        geometry.faces = spotContext.faces;
        geometry.computeBoundingSphere();
        return geometry;
    }

    private get hangers(): Geometry {
        const spotContext: ISpotContext = {
            faces: [],
            vertices: [],
            owner: this.props.island.owner,
            singleGotch: this.props.island.gotches.length === 1
        };
        this.props.island.gotches
            .map(gotch => gotch.center)
            .forEach(spot => spot.addHangerGeometry(spotContext));
        const geometry = new Geometry();
        geometry.vertices = spotContext.vertices;
        geometry.computeBoundingSphere();
        return geometry;
    }
}
