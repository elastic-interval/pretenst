/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { BufferGeometry, Float32BufferAttribute } from "three"

import { Hexalot } from "../island/hexalot"
import { Journey } from "../island/journey"

import { JOURNEY } from "./materials"

const TRIP_ALTITUDE = 0.3

export interface IJourneyProps {
    journey: Journey
}

export class JourneyComponent extends React.Component<IJourneyProps, object> {
    private geometry: BufferGeometry

    constructor(props: IJourneyProps) {
        super(props)
        this.state = {}
    }

    public componentWillReceiveProps(): void {
        const positions: number[] = []
        this.props.journey.visits.forEach((hexalot: Hexalot) => {
            const center = hexalot.centerSpot.center
            positions.push(center.x)
            positions.push(TRIP_ALTITUDE)
            positions.push(center.z)
        })
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", new Float32BufferAttribute(positions, 3))
        this.geometry = geometry
    }

    public componentWillUnmount(): void {
        this.geometry.dispose()
    }

    public render(): JSX.Element {
        return <R3.Line key="Journey" geometry={this.geometry} material={JOURNEY}/>
    }

}
