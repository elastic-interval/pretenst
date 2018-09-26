import * as React from 'react';
import * as R3 from 'react-three';
import {GOTCHI_MATERIAL} from './materials';
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
        return <R3.Mesh
            key={`Gotchi`}
            geometry={this.props.gotchi.fabric.facesGeometry}
            material={GOTCHI_MATERIAL}
        />
    }
}