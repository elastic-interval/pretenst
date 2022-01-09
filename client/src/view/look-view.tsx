/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Euler, Vector3 } from "three"

import { Tensegrity } from "../fabric/tensegrity"
import { IInterval, intervalRotation } from "../fabric/tensegrity-types"
import { ViewMode } from "../storage/recoil"

import { cylinderRadius, CYLINDER_GEOMETRY, roleMaterial } from "./materials"

export function LookView({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const instance = tensegrity.instance
    return (
        <group>
            {tensegrity.intervals.map((interval: IInterval) => {
                const {alpha, omega, role} = interval
                const rotation = intervalRotation(instance.unitVector(interval.index))
                const length = instance.jointDistance(alpha, omega)
                const radius = cylinderRadius(interval, ViewMode.Look)
                const intervalScale = new Vector3(radius, length, radius)
                return (
                    <mesh
                        key={`T${interval.index}`}
                        geometry={CYLINDER_GEOMETRY}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={roleMaterial(role)}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}
        </group>
    )
}
