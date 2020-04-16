/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"

import { CYCLE_PATTERN, Evolution, IEvolutionSnapshot } from "./evolution"

export function EvolutionView({evolution, stopEvolution}: {
    evolution: Evolution,
    stopEvolution: () => void,
}): JSX.Element {
    const [snapshots, setSnapshots] = useState<IEvolutionSnapshot[]>([])
    const [snapshot, setSnapshot] = useState<IEvolutionSnapshot>(evolution.snapshotsSubject.getValue())
    useEffect(() => {
        const alreadyHere = snapshots.findIndex(({cycleIndex}) => snapshot.cycleIndex === cycleIndex)
        if (alreadyHere < 0) {
            setSnapshots([...snapshots, snapshot])
        } else if (alreadyHere === snapshots.length - 1) {
            const copy = [...snapshots]
            copy[alreadyHere] = snapshot
            setSnapshots(copy)
        } else {
            setSnapshots([snapshot])
        }
    }, [snapshot])
    useEffect(() => {
        const sub = evolution.snapshotsSubject.subscribe(setSnapshot)
        return () => sub.unsubscribe()
    }, [evolution])
    return (
        <div className="text-monospace d-inline-flex">
            {snapshots.map(({cycle, cycleIndex, competitors}) => (
                <div key={cycleIndex} className="float-left p-1 m-1" style={{
                    borderStyle: "solid",
                    borderWidth: "2px",
                }}>
                    <div className="p-1 my-2 w-100 text-center">
                        {cycle === CYCLE_PATTERN[cycleIndex] ? undefined : <span>{cycle}/</span>}
                        {CYCLE_PATTERN.map((cycles, index) => (
                            <span
                                key={`cycle-${index}`}
                                style={{
                                    backgroundColor: index === cycleIndex ? "#24f00f" : "#d5d5d5",
                                    margin: "0.1em",
                                    padding: "0.2em",
                                    borderRadius: "0.3em",
                                    borderStyle: "solid",
                                    borderWidth: "1px",
                                }}
                            >{cycles}</span>
                        ))}
                    </div>
                    <div className="m-2">
                        {competitors.map(({name, proximity, generation, dead, saved}, index) => (
                            <div key={`competitor-${index}`} style={{
                                color: dead ? "#aba08d" : "#1d850b",
                                backgroundColor: saved ? "#3bfa19" : "#ffffff",
                                display: "block",
                            }}>
                                <strong>{index}:</strong>
                                <span className="mx-1">{proximity.toFixed(2)}</span>
                                <span className="mx-1">"{name}:{generation}"</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
