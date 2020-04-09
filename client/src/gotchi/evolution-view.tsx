/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaDna, FaSkull, FaTimesCircle } from "react-icons/all"
import { Button, Table } from "reactstrap"

import { CYCLE_PATTERN, Evolution } from "./evolution"

export function EvolutionView({evolution, stopEvolution}: {
    evolution: Evolution,
    stopEvolution: () => void,
}): JSX.Element {
    const [snapshot, updateSnapshot] = useState(evolution.snapshotSubject.getValue())
    useEffect(() => {
        const sub = evolution.snapshotSubject.subscribe(updateSnapshot)
        return () => sub.unsubscribe()
    }, [evolution])
    return (
        <>
            <div id="top-left" className="text-center">
                <h6 className="w-100">Running for {snapshot ? snapshot.nextMaxCycles : CYCLE_PATTERN[0]} cycles</h6>
                <Button className="w-100" color="warning" onClick={stopEvolution}>
                    Stop evolving <FaTimesCircle/>
                </Button>
            </div>
            {!snapshot ? undefined : (
                <div id="bottom-right" className="text-center">
                    <h6 className="w-100">After {CYCLE_PATTERN[snapshot.cyclePatternIndex]} cycles:</h6>
                    <CyclePattern cyclePatternIndex={snapshot.cyclePatternIndex}/>
                    <Table>
                        <thead>
                        <tr>
                            <th>Proximity</th>
                            <th>History</th>
                        </tr>
                        </thead>
                        <tbody>
                        {snapshot.competitors.map(({name, distanceFromTarget, generation, dead, saved}, index) => (
                            <tr key={`competitor-${index}`} style={{
                                color: dead ? "#aba08d" : "#1d850b",
                            }}>
                                <td>{distanceFromTarget.toFixed(1)}</td>
                                <td>
                                    {name}({generation})
                                    {saved ? <FaDna/> : undefined}
                                    {dead ? <FaSkull/> : undefined}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                </div>
            )}
        </>
    )
}

function CyclePattern({cyclePatternIndex}: { cyclePatternIndex: number }): JSX.Element {
    return (
        <div className="p-1">
            {CYCLE_PATTERN.map((cycles, index) => (
                <span
                    key={`cycle-${index}`}
                    style={{
                        backgroundColor: index === cyclePatternIndex ? "#24f00f" : "#d5d5d5",
                        width: "2em",
                        margin: "0.1em",
                        padding: "0.2em",
                        borderRadius: "0.3em",
                        borderStyle: "solid",
                        borderWidth: "1px",
                        fontSize: "xx-small",
                    }}
                >{cycles}</span>
            ))}
        </div>
    )
}
