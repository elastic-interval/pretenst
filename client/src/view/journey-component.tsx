/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

import { HUNG_ALTITUDE } from "../body/fabric"
import { Journey } from "../island/journey"

import { JOURNEY } from "./materials"

const ARROW_SIZE = 0.9

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
        const journey = this.props.journey
        const positions = new Float32Array(journey.visits.length * 6)
        const fromTo = new Vector3()
        for (let walk = 0; walk < journey.visits.length - 1; walk++) {
            const from = new Vector3().add(journey.visits[walk].center)
            const to = new Vector3().add(journey.visits[walk + 1].center)
            fromTo.subVectors(to, from).normalize()
            from.addScaledVector(fromTo, (1 - ARROW_SIZE) / 2)
            to.addScaledVector(fromTo, -(1 - ARROW_SIZE) / 2)
            let offset = walk * 6
            positions[offset++] = from.x
            positions[offset++] = HUNG_ALTITUDE
            positions[offset++] = from.z
            positions[offset++] = to.x
            positions[offset++] = HUNG_ALTITUDE
            positions[offset++] = to.z
        }
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", new Float32BufferAttribute(positions, 3))
        this.geometry = geometry
    }

    public componentWillUnmount(): void {
        this.geometry.dispose()
    }

    public render(): JSX.Element {
        return <R3.LineSegments key="Journey" geometry={this.geometry} material={JOURNEY}/>
    }

}
