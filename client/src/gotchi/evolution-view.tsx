/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaDna, FaSkull } from "react-icons/all"
import { Table } from "reactstrap"

import { Evolution } from "./evolution"

export function EvolutionView({evolution}: {
    evolution: Evolution,
}): JSX.Element {
    const [snapshot, updateSnapshot] = useState(evolution.snapshotSubject.getValue())
    useEffect(() => {
        const sub = evolution.snapshotSubject.subscribe(updateSnapshot)
        return () => sub.unsubscribe()
    }, [evolution])
    const {minCycles, currentCycle, maxCycles, competitors} = snapshot
    return (
        <div id="top-left">
            <h6>{evolution.evolvers.length.toFixed(0)} Evolvers [cycles {minCycles} to {maxCycles - 1}]</h6>
            <Table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>Distance/Cycles</th>
                    <th>Generation</th>
                </tr>
                </thead>
                <tbody>
                {competitors.map(({name, distanceFromTarget, generation, dead, saved}, index) => (
                    <tr key={`competitor-${index}`} style={{
                        color: dead ? "#aba08d" : "#1d850b",
                    }}>
                        <td>
                            {name} {saved ? <FaDna/> : undefined}
                        </td>
                        <td>
                            {distanceFromTarget.toFixed(1)}/{currentCycle}
                        </td>
                        <td>
                            {generation}&nbsp;
                            {dead ? <FaSkull/> : undefined}
                        </td>
                    </tr>
                ))}
                </tbody>
            </Table>
        </div>
    )
}
