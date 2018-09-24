import * as React from 'react';
import * as R3 from 'react-three';
import {FaceColors, MeshPhongMaterial, Vector3} from 'three';
import {Island} from '../island/island';

export interface ISurfaceMeshProps {
    island: Island;
}

export interface ISurfaceMeshState {
    editMode: boolean;
}

const FLOOR_MATERIAL = new MeshPhongMaterial({
    vertexColors: FaceColors,
    lights: true,
    visible: true
});

const SCALE_FLOOR = new Vector3(10, 10, 10);

export class IslandMesh extends React.Component<ISurfaceMeshProps, ISurfaceMeshState> {

    constructor(props: ISurfaceMeshProps) {
        super(props);
        this.state = {
            editMode: false
        };
    }

    public render() {
        return <R3.Mesh key="Floor" geometry={this.props.island.geometry} scale={SCALE_FLOOR} material={FLOOR_MATERIAL}/>
    }
}