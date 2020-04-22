/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaDna, FaYinYang } from "react-icons/all"

import { IEvolutionSnapshot, letter } from "./evolution"

export function EvolutionStats({snapshots}: {
    snapshots: IEvolutionSnapshot[],
}): JSX.Element {
    return (
        <div className="text-monospace d-inline-flex">
            {snapshots.map(snapshot => (
                <div key={snapshot.cycleIndex} className="float-left p-1 m-1" style={{
                    borderStyle: "solid",
                    borderWidth: "2px",
                }}>
                    <EvolutionInfo snapshot={snapshot}/>
                    <div className="m-2">
                        {snapshot.evolverSnapshots.map((evolverSnapshot, index) => {
                            const {name, reachedTarget, persisted, proximity, tosses} = evolverSnapshot
                            const mutationSymbols = []
                            let nameLength = name.length - 1
                            while (nameLength > 0) {
                                mutationSymbols.push(<FaDna key={`${name}-${nameLength}`}/>)
                                nameLength--
                            }
                            const reachedSymbol = reachedTarget ? <FaYinYang/> : undefined
                            return (
                                <div key={`competitor-${index}`} style={{
                                    color: persisted ? reachedTarget ? "#ffffff" : "#2cd710" : "#c2c2c2",
                                    backgroundColor: persisted ? reachedTarget ? "#b1b1b1" : "#848383" : "#555454",
                                    borderRadius: "0.2em",
                                    marginBottom: "1px",
                                    padding: "2px",
                                    display: "block",
                                    whiteSpace: "nowrap",
                                }}>
                                    {`${letter(index)} ${proximity.toFixed(3)} ${name}${tosses}`}
                                    &nbsp;
                                    {mutationSymbols}{reachedSymbol}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

export function EvolutionInfo({snapshot}: { snapshot: IEvolutionSnapshot }): JSX.Element {
    const {cyclePattern, cycleIndex, cycle} = snapshot
    return (
        <div className="p-1 my-2 w-100 text-center">
            {cyclePattern.map((cycles, index) => (
                <span
                    key={`cycle-${index}`}
                    style={{
                        color: "black",
                        backgroundColor: index === cycleIndex ? "#24f00f" : "#cbc7c7",
                        margin: "0.1em",
                        padding: "0.2em",
                        borderRadius: "0.3em",
                        borderStyle: "solid",
                        borderWidth: "1px",
                    }}
                >{index === cycleIndex && cycle < cyclePattern[cycleIndex] ? `${cycle + 1}/${cycles}` : cycles}</span>
            ))}
        </div>
    )
}
