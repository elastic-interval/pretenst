import * as React from 'react';
import * as R3 from 'react-three';
import {FOREIGN_HANGER_MATERIAL, GOTCHI_GHOST_MATERIAL} from './materials';
import {Gotchi} from '../gotchi/gotchi';
import {Geometry, Vector3} from 'three';

export interface IGotchiMeshProps {
    gotchi: Gotchi;
}

export interface IGotchiMeshState {
    nothingYet?: Gotchi
}

export class GotchiComponent extends React.Component<IGotchiMeshProps, IGotchiMeshState> {

    constructor(props: IGotchiMeshProps) {
        super(props);
        this.state = {};
    }

    public render() {
        const fabric = this.props.gotchi.fabric;
        const pointer = new Geometry();
        const seed = fabric.seedVector;
        const head = new Vector3().add(seed).addScaledVector(fabric.headVector, 5);
        pointer.vertices = [seed, head];
        return (
            <R3.Object3D key="Gotchi">
                <R3.LineSegments
                    key="Pointer"
                    geometry={pointer}
                    material={FOREIGN_HANGER_MATERIAL}
                />
                <R3.Mesh
                    key={`Gotchi`}
                    geometry={fabric.facesGeometry}
                    material={GOTCHI_GHOST_MATERIAL}
                />
            </R3.Object3D>
        );
    }
}