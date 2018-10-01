import * as React from 'react';
import * as R3 from 'react-three';
import {Evolution} from '../gotchi/evolution';
import {Gotchi} from '../gotchi/gotchi';
import {GOTCHI_GHOST_MATERIAL} from './materials';

export interface IEvolutionProps {
    evolution: Evolution;
}

export interface IEvolutionState {
    nothingYet?: Gotchi
}

export class EvolutionComponent extends React.Component<IEvolutionProps, IEvolutionState> {

    constructor(props: IEvolutionProps) {
        super(props);
        this.state = {};
    }

    public render() {
        return <R3.Object3D key="EvolutionMesh">{
            this.props.evolution.forDisplay.map((gotchi: Gotchi, index: number) => {
                return <R3.Mesh
                    ref={(node: any) => gotchi.facesMeshNode = node}
                    key={`Faces${index}`}
                    geometry={gotchi.fabric.facesGeometry}
                    material={GOTCHI_GHOST_MATERIAL}
                />
            })
        }</R3.Object3D>;
    }
}