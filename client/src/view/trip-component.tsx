import * as React from 'react';
import * as R3 from 'react-three';
import {BufferGeometry, Float32BufferAttribute} from 'three';

import {Spot} from '../island/spot';
import {Trip} from '../island/trip';

import {TRIP_MATERIAL} from './materials';

const TRIP_ALTITUDE = 0.3;

export interface ITripComponentProps {
    trip: Trip;
}

export interface ITripComponentState {
    geometry?: BufferGeometry;
    nextSpot?: Spot;
}

function geometryRefreshed(state: ITripComponentState, props: ITripComponentProps) {
    if (state.geometry) {
        state.geometry.dispose();
    }
    const positions: number[] = [];
    props.trip.spots.forEach(spot => {
        positions.push(spot.center.x);
        positions.push(TRIP_ALTITUDE);
        positions.push(spot.center.z);
    });
    const geometry = new BufferGeometry();
    geometry.addAttribute('position', new Float32BufferAttribute(positions, 3));
    return {
        geometry,
    };
}

export class TripComponent extends React.Component<ITripComponentProps, ITripComponentState> {

    constructor(props: ITripComponentProps) {
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
