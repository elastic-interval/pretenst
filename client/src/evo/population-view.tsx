/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Vector3 } from "three"

import { Population } from "./population"
import { RunnerView } from "./runner-view"

export function PopulationView({population}: { population: Population }): JSX.Element {
    const height = 6
    const midpoint = new Vector3()
    population.getMidpoint(midpoint)
    const target = population.target
    return (
        <group>
            {population.winners.map(({runner}, index) => (
                <RunnerView key={`evolving-${index}`} runner={runner}/>
            ))}
            {!population.challengersVisible ? undefined : population.challengers.map(({runner}, index) => (
                <RunnerView key={`evolving-${index + population.winners.length}`} runner={runner}/>
            ))}
            <lineSegments>
                <bufferGeometry attach="geometry">
                    <bufferAttribute
                        attachObject={["attributes", "position"]}
                        array={new Float32Array([
                            midpoint.x, 0, midpoint.z,
                            midpoint.x, height, midpoint.z,
                            midpoint.x, height, midpoint.z,
                            target.x, height, target.z,
                            target.x, height, target.z,
                            target.x, 0, target.z,
                        ])}
                        count={6}
                        itemSize={3}
                        onUpdate={self => self.needsUpdate = true}
                    />
                </bufferGeometry>
                <lineBasicMaterial attach="material" color={"#cace02"}/>
            </lineSegments>
        </group>
    )
}
