/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaDna, FaSkull } from "react-icons/all"
import { Button, Table } from "reactstrap"

import { Evolution } from "./evolution"

export function EvolutionView({evolution, stopEvolution}: {
    evolution: Evolution,
    stopEvolution: () => void,
}): JSX.Element {
    const [snapshot, updateSnapshot] = useState(evolution.snapshotSubject.getValue())
    useEffect(() => {
        const sub = evolution.snapshotSubject.subscribe(updateSnapshot)
        return () => sub.unsubscribe()
    }, [evolution])
    const {currentCycle, maxCycles, competitors} = snapshot
    return (
        <div id="top-left">
            <h6 className="w-100">{competitors.length.toString()} Evolvers [cycle {currentCycle}/{maxCycles - 1}]</h6>
            <Table>
                <thead>
                <tr>
                    <th>Proximity</th>
                    <th>Name</th>
                </tr>
                </thead>
                <tbody>
                {competitors.map(({name, distanceFromTarget, generation, dead, saved}, index) => (
                    <tr key={`competitor-${index}`} style={{
                        color: dead ? "#aba08d" : "#1d850b",
                    }}>
                        <td>{distanceFromTarget.toFixed(1)}</td>
                        <td>{name}({generation}) {saved ? <FaDna/> : undefined} {dead ? <FaSkull/> : undefined}</td>
                    </tr>
                ))}
                </tbody>
            </Table>
            <hr/>
            <Button className="w-100" color="warning" onClick={stopEvolution}>
                Abort!
            </Button>
        </div>
    )
}
