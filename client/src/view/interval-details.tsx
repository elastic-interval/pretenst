/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaMousePointer } from "react-icons/all"
import { Html } from "react-three-drei-without-subdivision"
import { Table } from "reactstrap"

import { FabricInstance } from "../fabric/fabric-instance"
import { IIntervalDetails } from "../fabric/tensegrity-types"

const DIGITS = 1

export function IntervalDetails({instance, details, singleDetails, onClick}: {
    instance: FabricInstance,
    details: IIntervalDetails,
    singleDetails: boolean,
    onClick: (details: IIntervalDetails) => void,
}): JSX.Element {
    return (
        <Html
            className={`interval-details ${singleDetails ? "single-details" : ""}`}
            position={instance.intervalLocation(details.interval)}
        >
            <div onMouseDown={(e) => onClick(details)}>

                <div className="details-mouse">
                    <FaMousePointer/>
                </div>
                <Table className="details-table">
                    <thead>
                    <tr>
                        <td colSpan={2}>{details.interval.alpha.index}-{details.interval.omega.index}</td>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td className="text-right">Length:</td>
                        <td className="text-center">{details.length.toFixed(DIGITS)}mm</td>
                    </tr>
                    <tr>
                        <td className="text-right">Height:</td>
                        <td className="text-center">{(details.height).toFixed(DIGITS)}mm</td>
                    </tr>
                    <tr>
                        <td className="text-right">Strain:</td>
                        <td className="text-center">{(details.strain * 100).toFixed(DIGITS)}%</td>
                    </tr>
                    </tbody>
                </Table>
            </div>
        </Html>
    )
}
