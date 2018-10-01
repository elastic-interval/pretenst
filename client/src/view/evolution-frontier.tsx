import * as React from 'react';
import * as R3 from 'react-three';
import {BufferGeometry, Float32BufferAttribute, LineBasicMaterial} from 'three';
import {IFrontier} from '../gotchi/evolution';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

const FRONTIER_ALTITUDE = 0.3;
const WALL_STEP_DEGREES = 3;
const FRONTIER_MATERIAL = new LineBasicMaterial({color: 0xBBBBBB});

export interface IEvolutionFrontierProps {
    frontier: BehaviorSubject<IFrontier>;
}

export interface IEvolutionFrontierState {
    geometry?: BufferGeometry;
}

const createFrontierGeometry = (frontier: IFrontier): BufferGeometry => {
    const radius = frontier.radius;
    const geometry = new BufferGeometry();
    const positions = new Float32Array(360 * 6 / WALL_STEP_DEGREES);
    let slot = 0;
    for (let degrees = 0; degrees < 360; degrees += WALL_STEP_DEGREES) {
        const r1 = Math.PI * 2 * degrees / 360;
        const r2 = Math.PI * 2 * (degrees + WALL_STEP_DEGREES) / 360;
        positions[slot++] = radius * Math.sin(r1);
        positions[slot++] = FRONTIER_ALTITUDE;
        positions[slot++] = radius * Math.cos(r1);
        positions[slot++] = radius * Math.sin(r2);
        positions[slot++] = FRONTIER_ALTITUDE;
        positions[slot++] = radius * Math.cos(r2);
    }
    geometry.addAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
};

export class EvolutionFrontier extends React.Component<IEvolutionFrontierProps, IEvolutionFrontierState>  {

    constructor(props: IEvolutionFrontierProps) {
        super(props);
        this.state = {
            geometry: createFrontierGeometry(props.frontier.getValue())
        };
    }

    public componentDidMount() {
        this.props.frontier.subscribe(frontier => this.setState({geometry: createFrontierGeometry(frontier)}));
    }

    public render() {
        if (!this.state.geometry) {
            return <R3.Object3D key="NotFrontier"/>;
        } else {
            return <R3.LineSegments key="Frontier" geometry={this.state.geometry} material={FRONTIER_MATERIAL}/>;
        }
    }

}