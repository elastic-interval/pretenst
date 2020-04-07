/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaDna, FaSkull, FaTimesCircle } from "react-icons/all"
import { Button, ButtonGroup, Table } from "reactstrap"

import { Evolution } from "./evolution"

const SPEED = [1, 3, 6, 9, 12]

export function EvolutionView({evolution, stopEvolution}: {
    evolution: Evolution,
    stopEvolution: () => void,
}): JSX.Element {
    const [snapshot, updateSnapshot] = useState(evolution.snapshotSubject.getValue())
    const [ticks, setTicks] = useState(evolution.ticksSubject.getValue())
    useEffect(() => {
        const subs = [
            evolution.snapshotSubject.subscribe(updateSnapshot),
            evolution.ticksSubject.subscribe(setTicks),
        ]
        return () => subs.forEach(sub => sub.unsubscribe())
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
            <ButtonGroup className="w-100 small">
                <Button size="sm" color="warning" onClick={stopEvolution}>
                    <FaTimesCircle/>
                </Button>
                {SPEED.map(chosenTicks => (
                    <Button color="success" size="sm" disabled={ticks === chosenTicks} key={`speed-${chosenTicks}`}
                            onClick={() => evolution.ticksSubject.next(chosenTicks)}
                    >
                        {chosenTicks}
                    </Button>
                ))}
            </ButtonGroup>
        </div>
    )
}
