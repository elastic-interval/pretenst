import * as React from 'react';
import * as R3 from 'react-three';
import {Population} from '../gotchi/population';
import {Gotchi} from '../gotchi/gotchi';
import {GOTCHI_FACE_MATERIAL} from './materials';

export interface IPopulationMeshProps {
    population: Population
}

export interface IPopulationMeshState {
    selectedGotchi?: Gotchi
}

export class PopulationComponent extends React.Component<IPopulationMeshProps, IPopulationMeshState> {

    constructor(props: IPopulationMeshProps) {
        super(props);
        this.state = {};
    }

    public render() {
        return <R3.Object3D key="PopulationMesh">{
            this.props.population.forDisplay.map((gotchi: Gotchi, index: number) => {
                return <R3.Mesh
                    ref={(node: any) => gotchi.facesMeshNode = node}
                    key={`Faces${index}`}
                    geometry={gotchi.fabric.facesGeometry}
                    material={GOTCHI_FACE_MATERIAL}
                />
            })
        }</R3.Object3D>;
    }
}