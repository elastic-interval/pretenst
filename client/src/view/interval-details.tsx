/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Html } from "@react-three/drei"
import * as React from "react"
import { FaArrowsAltH, FaMousePointer } from "react-icons/all"
import { Table } from "reactstrap"

import { intervalRoleName } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { IInterval, IIntervalDetails } from "../fabric/tensegrity-types"

const DIGITS = 1

export function IntervalDetails({instance, interval, details}: {
    instance: FabricInstance,
    interval: IInterval,
    details: IIntervalDetails,
}): JSX.Element {
    const {alpha, omega, intervalRole} = interval
    return (
        <Html
            className="interval-details"
            style={{width: "10em"}}
            position={instance.intervalLocation(interval)}
        >
            <div style={{position: "absolute", top: "0", left: "0", color: "red"}}>
                <FaMousePointer/>
            </div>
            <Table>
                <thead>
                <tr>
                    <th colSpan={2}>
                        ({alpha.index + 1} <FaArrowsAltH/> {omega.index + 1}): {intervalRoleName(intervalRole)}
                    </th>
                </tr>
                </thead>
                <tbody>
                {/*<tr>*/}
                {/*    <td className="text-right">Stiffness:</td>*/}
                {/*    <td>{stats.stiffness.toFixed(DIGITS)}</td>*/}
                {/*</tr>*/}
                {/*<tr>*/}
                {/*    <td className="text-right">Strain:</td>*/}
                {/*    <td>{stats.strain.toFixed(DIGITS)}</td>*/}
                {/*</tr>*/}
                <tr>
                    <td className="text-right">Length:</td>
                    <td className="text-center">{details.length.toFixed(DIGITS)}</td>
                </tr>
                <tr>
                    <td className="text-right">Ideal Length:</td>
                    <td className="text-center">{details.idealLength.toFixed(DIGITS)}</td>
                </tr>
                {/*<tr>*/}
                {/*    <td className="text-right">Linear Density:</td>*/}
                {/*    <td>{stats.linearDensity.toFixed(DIGITS)}</td>*/}
                {/*</tr>*/}
                <tr>
                    <td className="text-right">Height:</td>
                    <td className="text-center">{details.height.toFixed(DIGITS)}</td>
                </tr>
                </tbody>
            </Table>
        </Html>
    )
}
