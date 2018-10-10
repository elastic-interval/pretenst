import * as React from 'react';
import * as R3 from 'react-three';
import {BufferGeometry, Color, Float32BufferAttribute, LineBasicMaterial} from 'three';
import {Spot} from '../island/spot';

const TRIP_ALTITUDE = 0.3;
const TRIP_MATERIAL = new LineBasicMaterial({color: new Color('green')});

export interface ITripProps {
    tripSpots: Spot[];
}

export interface ITripState {
    geometry?: BufferGeometry;
    nextSpot?: Spot;
}

function geometryRefreshed(state: ITripState, props: ITripProps) {
    if (state.geometry) {
        state.geometry.dispose();
    }
    const positions: number[] = [];
    props.tripSpots.forEach(spot => {
        positions.push(spot.center.x);
        positions.push(TRIP_ALTITUDE);
        positions.push(spot.center.z);
    });
    const geometry = new BufferGeometry();
    geometry.addAttribute('position', new Float32BufferAttribute(positions, 3));
    return {
        geometry
    };
}

export class Trip extends React.Component<ITripProps, ITripState> {

    constructor(props: ITripProps) {
        super(props);
        this.state = {};
    }

    public componentWillReceiveProps() {
        this.setState(geometryRefreshed);
    }

    public render() {
        if (!this.state.geometry) {
            return <R3.Object3D key="NoTrip"/>;
        } else {
            return <R3.Line key="Trip" geometry={this.state.geometry} material={TRIP_MATERIAL}/>;
        }
    }

}