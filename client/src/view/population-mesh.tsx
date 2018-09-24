import * as React from 'react';
import * as R3 from 'react-three';
import {Population} from '../gotchi/population';
import {Gotchi} from '../gotchi/gotchi';
import {Color, MeshPhongMaterial} from 'three';

export interface IPopulationMeshProps {
    population: Population
}

export interface IPopulationMeshState {
    selectedGotchi?: Gotchi
}

const FACE_MATERIAL = new MeshPhongMaterial({
    lights: true,
    color: new Color(0.9, 0.9, 0.9),
    transparent: true,
    opacity: 0.8,
    visible: true
});

export class PopulationMesh extends React.Component<IPopulationMeshProps, IPopulationMeshState> {

    constructor(props: IPopulationMeshProps) {
        super(props);
        this.state = {};
    }

    public render() {
        return <R3.Object3D key="PopulationMesh">{
            this.props.population.forDisplay.map((gotchi: Gotchi, index: number) => {
                return <R3.Mesh
                    ref={(node: any) => gotchi.facesMeshNode = node}
                    key={`Faces${index}`} name="Fabric"
                    geometry={gotchi.fabric.facesGeometry}
                    material={FACE_MATERIAL}
                />
            })
        }</R3.Object3D>;
    }
}