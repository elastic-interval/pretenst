/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Badge } from "reactstrap"

import { Grouping } from "../view/control-tabs"

import { Evolution, ICompetitor } from "./evolution"

export function EvolutionView({evolution}: {
    evolution: Evolution,
}): JSX.Element {
    const [snapshot, updateSnapshot] = useState(evolution.snapshotSubject.getValue())
    useEffect(() => {
        const sub = evolution.snapshotSubject.subscribe(updateSnapshot)
        return () => sub.unsubscribe()
    }, [evolution])
    return (
        <div id="top-left">
            <Grouping>
                <h6>{evolution.evolvers.length.toFixed(0)} Evolvers</h6>
                {snapshot.competitors.map((evolver, index) => (
                    <EvolverView key={`evo-view-${index}`} competitor={evolver} alive={index < snapshot.survivorCount}/>
                ))}
                <div>
                    <Badge>min={snapshot.minCycles}</Badge>
                    <Badge>curr={snapshot.currentCycle}</Badge>
                    <Badge>max={snapshot.maxCycles}</Badge>
                </div>
            </Grouping>
        </div>
    )
}

function EvolverView({competitor, alive}: { competitor: ICompetitor, alive: boolean }): JSX.Element {
    return (
        <div style={{
            color: alive ?
                "#31ce13" :
                "#c03b02",
        }}>
            {competitor.distanceFromTarget.toFixed(1)}
        </div>
    )
}
