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
import { FabricInstance } from "../fabric/fabric-instance"
import { addIntervalStats, expectStats, IInterval } from "../fabric/tensegrity-types"

export function IntervalStatsSnapshot({instance, interval}: {
    instance: FabricInstance,
    interval: IInterval,
}): JSX.Element {
    const {alpha, omega, intervalRole} = interval
    const stats = expectStats(interval)
    return (
        <Html
            className="interval-stats"
            style={{width: "10em"}}
            position={instance.intervalLocation(interval)}
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
                        ({alpha.index + 1} <FaArrowsAltH/> {omega.index + 1}): {intervalRoleName(intervalRole)}
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
                <tr>
                    <td className="text-right">Linear Density:</td>
                    <td>{stats.linearDensity.toFixed(8)}</td>
                </tr>
                </tbody>
            </Table>
        </Html>
    )
}

export function IntervalStatsLive({instance, interval, pushOverPull, pretenst}: {
    instance: FabricInstance, interval: IInterval, pushOverPull: number, pretenst: number,
}): JSX.Element {
    const [stats, updateStats] = useState(expectStats(interval))
    useFrame(() => updateStats(addIntervalStats(instance, interval, pushOverPull, pretenst)))
    return (
        <Html className="interval-stats"
              style={{
                  fontFamily: "fixed",
                  padding: "0.1em",
                  width: "7em",
                  textAlign: "center",
              }}
              position={instance.intervalLocation(interval)}>
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
