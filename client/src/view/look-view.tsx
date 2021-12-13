/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRecoilState } from "recoil"
import { Euler, Vector3 } from "three"

import { ADJUSTABLE_INTERVAL_ROLES } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval, intervalRotation } from "../fabric/tensegrity-types"
import { ViewMode, visibleRolesAtom } from "../storage/recoil"

import { cylinderRadius, CYLINDER_GEOMETRY, roleMaterial } from "./materials"

export function LookView({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const instance = tensegrity.instance
    const [visibleRoles] = useRecoilState(visibleRolesAtom)
    const intervals = visibleRoles.length === ADJUSTABLE_INTERVAL_ROLES.length ? tensegrity.intervals :
        tensegrity.intervals.filter(interval => visibleRoles.some(role => role === interval.intervalRole))
    return (
        <group>
            {intervals.map((interval: IInterval) => {
                const {alpha, omega, intervalRole} = interval
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
                        material={roleMaterial(intervalRole)}
                        matrixWorldNeedsUpdate={true}
                    />
                )
            })}
        </group>
    )
}
