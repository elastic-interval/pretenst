/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaDna } from "react-icons/all"

import { IEvolutionSnapshot, letter } from "./evolution"

export function EvolutionView({snapshots}: {
    snapshots: IEvolutionSnapshot[],
}): JSX.Element {
    return (
        <div className="text-monospace d-inline-flex">
            {snapshots.map(({cycle, cyclePattern, cycleIndex, competitors}) => (
                <div key={cycleIndex} className="float-left p-1 m-1" style={{
                    borderStyle: "solid",
                    borderWidth: "2px",
                }}>
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
                            >{index === cycleIndex && cycle < cyclePattern[cycleIndex] ? `${cycle}/${cycles}` : cycles}</span>
                        ))}
                    </div>
                    <div className="m-2">
                        {competitors.map(({name, proximity, tosses, dead, saved}, index) => {
                            const mutationSymbols = []
                            let nameLength = name.length - 1
                            while (nameLength > 0) {
                                mutationSymbols.push(<FaDna key={`${name}-${nameLength}`}/>)
                                nameLength--
                            }
                            return (
                                <div key={`competitor-${index}`} style={{
                                    color: dead ? "#af0303" : "#2cd710",
                                    backgroundColor: saved ? "#848383" : "#555454",
                                    borderRadius: "0.2em",
                                    marginBottom: "1px",
                                    padding: "2px",
                                    display: "block",
                                    whiteSpace: "nowrap",
                                }}>
                                    {`${letter(index)} ${proximity.toFixed(3)} ${name}${tosses}`}
                                    &nbsp;
                                    {mutationSymbols}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
