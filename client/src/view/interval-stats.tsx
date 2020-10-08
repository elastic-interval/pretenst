/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Html } from "@react-three/drei"
import * as React from "react"
import { useState } from "react"
import { FaArrowsAltH, FaMousePointer } from "react-icons/all"
import { useFrame } from "react-three-fiber"
import { Table } from "reactstrap"

import { intervalRoleName } from "../fabric/eig-util"
import { addIntervalStats, expectStats, IInterval, intervalLocation } from "../fabric/tensegrity-types"

export function IntervalStatsSnapshot({interval}: { interval: IInterval }): JSX.Element {
    const {alpha, omega, intervalRole} = interval
    const stats = expectStats(interval)
    return (
        <Html
            className="interval-stats"
            style={{width: "10em"}}
            position={intervalLocation(interval)}
        >
            <div style={{position: "absolute", top: "0", left: "0", color: "red"}}>
                <FaMousePointer/>
            </div>
            <Table
                onClick={event => {
                    event.stopPropagation()
                    interval.stats = undefined
                }}>
                <thead>
                <tr>
                    <th colSpan={2}>
                        ({alpha.index} <FaArrowsAltH/> {omega.index}): {intervalRoleName(intervalRole, true)}
                    </th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td className="text-right">Stiffness:</td>
                    <td>{stats.stiffness.toFixed(8)}</td>
                </tr>
                <tr>
                    <td className="text-right">Strain:</td>
                    <td>{stats.strain.toFixed(8)}</td>
                </tr>
                <tr>
                    <td className="text-right">Length:</td>
                    <td>{stats.length.toFixed(8)}</td>
                </tr>
                <tr>
                    <td className="text-right">Ideal Length:</td>
                    <td>{stats.idealLength.toFixed(8)}</td>
                </tr>
                </tbody>
            </Table>
        </Html>
    )
}

export function IntervalStatsLive({interval}: { interval: IInterval }): JSX.Element {
    const [stats, updateStats] = useState(expectStats(interval))
    useFrame(() => updateStats(addIntervalStats(interval)))
    return (
        <Html className="interval-stats"
              style={{
                  fontFamily: "fixed",
                  padding: "0.1em",
                  width: "7em",
                  textAlign: "center",
              }}
              position={intervalLocation(interval)}>
            <div
                onClick={event => {
                    event.stopPropagation()
                    interval.stats = undefined
                }}
            >
                {stats.strain.toFixed(8)}
            </div>
        </Html>
    )
}
