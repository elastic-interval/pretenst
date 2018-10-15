import * as React from 'react';
import * as R3 from 'react-three';
import {FOREIGN_HANGER_MATERIAL, GOTCHI_MATERIAL} from './materials';
import {Gotchi} from '../gotchi/gotchi';

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
        return (
            <R3.Object3D key="Gotchi">
                <R3.LineSegments
                    key="Compass"
                    geometry={fabric.compassGeometry}
                    material={FOREIGN_HANGER_MATERIAL}
                />
                <R3.Mesh
                    key="Gotchi"
                    geometry={fabric.facesGeometry}
                    material={GOTCHI_MATERIAL}
                />
            </R3.Object3D>
        );
    }
}