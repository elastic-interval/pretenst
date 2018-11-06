import * as React from 'react';
import * as R3 from 'react-three';
import {GOTCHI_MATERIAL, GOTCHI_POINTER_MATERIAL} from './materials';
import {Gotchi} from '../gotchi/gotchi';
import {Geometry, Vector3} from 'three';

export interface IGotchiMeshProps {
    gotchi: Gotchi;
}

export interface IGotchiMeshState {
    pointerGeometry: Geometry
}

const POINTER_SIZE = 10;

function geometryRefreshed(state: IGotchiMeshState, props: IGotchiMeshProps) {
    const pointerGeometry = new Geometry();
    const fabric = props.gotchi.fabric;
    const travel = props.gotchi.travel;
    if (travel && !fabric.isGestating) {
        const seed = fabric.seed;
        const forward = fabric.forward;
        const right = fabric.right;
        const toTarget = new Vector3().subVectors(travel.goTo.center, seed).normalize();
        const goForward = toTarget.dot(forward);
        const goRight = toTarget.dot(right);
        const forwardEnd = new Vector3().add(seed).addScaledVector(forward, goForward * POINTER_SIZE);
        const rightEnd = new Vector3().add(seed).addScaledVector(right, goRight * POINTER_SIZE);
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
        const gotchi = this.props.gotchi;
        const fabric = gotchi.fabric;
        return (
            <R3.Object3D key="Gotchi">
                <R3.LineSegments
                    key="Vectors"
                    geometry={fabric.pointerGeometryFor(gotchi.direction)}
                    material={GOTCHI_POINTER_MATERIAL}
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