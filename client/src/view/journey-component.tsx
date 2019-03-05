import * as React from "react"
import * as R3 from "react-three"
import {BufferGeometry, Float32BufferAttribute} from "three"

import {Hexalot} from "../island/hexalot"
import {Journey} from "../island/journey"
import {Spot} from "../island/spot"

import {TRIP_MATERIAL} from "./materials"

const TRIP_ALTITUDE = 0.3

export interface IJourneyProps {
    journey: Journey
}

export interface IJourneyState {
    geometry?: BufferGeometry
    nextSpot?: Spot
}

function geometryRefreshed(state: IJourneyState, props: IJourneyProps): object {
    if (state.geometry) {
        state.geometry.dispose()
    }
    const positions: number[] = []
    props.journey.visits.forEach((hexalot: Hexalot) => {
        const center = hexalot.centerSpot.center
        positions.push(center.x)
        positions.push(TRIP_ALTITUDE)
        positions.push(center.z)
    })
    const geometry = new BufferGeometry()
    geometry.addAttribute("position", new Float32BufferAttribute(positions, 3))
    return {geometry}
}

export class JourneyComponent extends React.Component<IJourneyProps, IJourneyState> {

    constructor(props: IJourneyProps) {
        super(props)
        this.state = {}
    }

    public componentWillReceiveProps(): void {
        this.setState(geometryRefreshed)
    }

    public render(): JSX.Element {
        if (!this.state.geometry) {
            return <R3.Object3D key="NoTrip"/>
        } else {
            return <R3.Line key="Trip" geometry={this.state.geometry} material={TRIP_MATERIAL}/>
        }
    }

}
