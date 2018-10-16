import * as React from 'react';
import * as R3 from 'react-three';
import {FOREIGN_HANGER_MATERIAL, GOTCHI_MATERIAL, HOME_HANGER_MATERIAL} from './materials';
import {Gotchi} from '../gotchi/gotchi';
import {Geometry, Vector3} from 'three';

export interface IGotchiMeshProps {
    gotchi: Gotchi;
}

export interface IGotchiMeshState {
    pointerGeometry: Geometry
}

function geometryRefreshed(state: IGotchiMeshState, props: IGotchiMeshProps) {
    const pointerGeometry = new Geometry();
    const fabric = props.gotchi.fabric;
    const travel = props.gotchi.travel;
    if (travel) {
        const seed = fabric.seed;
        const forward = fabric.forward;
        const right = fabric.right;
        const toTarget = new Vector3().subVectors(travel.goTo.center, seed).normalize();
        const goForward = toTarget.dot(forward) > 0;
        const goRight = toTarget.dot(right) > 0;
        const forwardEnd = new Vector3().add(seed).addScaledVector(forward, goForward ? 10: -10);
        const rightEnd = new Vector3().add(seed).addScaledVector(right, goRight ? 10: -10);
        pointerGeometry.vertices = [seed, forwardEnd, seed, rightEnd];
    }
    state.pointerGeometry.dispose();
    return {pointerGeometry};
}

export class GotchiComponent extends React.Component<IGotchiMeshProps, IGotchiMeshState> {

    constructor(props: IGotchiMeshProps) {
        super(props);
        this.state = {
            pointerGeometry: new Geometry()
        };
    }

    public componentWillReceiveProps() {
        this.setState(geometryRefreshed);
    }

    public render() {
        const fabric = this.props.gotchi.fabric;
        return (
            <R3.Object3D key="Gotchi">
                <R3.LineSegments
                    key="Vectors"
                    geometry={this.state.pointerGeometry}
                    material={HOME_HANGER_MATERIAL}
                />
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