/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRecoilState } from "recoil"
import { Euler, Vector3 } from "three"

import { isPushRole } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { areAdjacent, IInterval, IIntervalDetails, intervalRotation } from "../fabric/tensegrity-types"
import { selectedTwistAtom, ViewMode, visibleDetailsAtom } from "../storage/recoil"

import { IntervalDetails } from "./interval-details"
import { cylinderRadius, CYLINDER_GEOMETRY, roleMaterial } from "./materials"

export function SelectView({tensegrity, clickDetails}: {
    tensegrity: Tensegrity,
    clickDetails: (details: IIntervalDetails) => void,
}): JSX.Element {
    const [selected, setSelected] = useRecoilState(selectedTwistAtom)
    const [details] = useRecoilState(visibleDetailsAtom)
    const instance = tensegrity.instance
    return (
        <group>
            {tensegrity.intervals.map((interval: IInterval) => {
                const isPush = isPushRole(interval.intervalRole)
                if (!isPush) {
                    if (selected) {
                        const adjacent = selected.pushes.find(push => areAdjacent(push, interval))
                        if (!adjacent) {
                            return undefined
                        }
                    } else {
                        return undefined
                    }
                }
                const rotation = intervalRotation(instance.unitVector(interval.index))
                const length = instance.jointDistance(interval.alpha, interval.omega)
                const radius = cylinderRadius(interval, ViewMode.Select)
                const intervalScale = new Vector3(radius, length, radius)
                return (
                    <mesh
                        key={`T${interval.index}`}
                        geometry={CYLINDER_GEOMETRY}
                        position={instance.intervalLocation(interval)}
                        rotation={new Euler().setFromQuaternion(rotation)}
                        scale={intervalScale}
                        material={roleMaterial(interval.intervalRole)}
                        matrixWorldNeedsUpdate={true}
                        onDoubleClick={event => {
                            event.stopPropagation()
                            if (!isPushRole(interval.intervalRole)) {
                                return
                            }
                            if (!selected) {
                                setSelected(tensegrity.findTwist(interval))
                            } else {
                                const again = selected.pushes.find(push => push.index === interval.index)
                                if (again) {
                                    setSelected(undefined)
                                } else {
                                    setSelected(tensegrity.findTwist(interval))
                                }
                            }
                        }}
                    />
                )
            })}
            {details.map(d => (
                <IntervalDetails key={`deets-${d.interval.index}`} instance={tensegrity.instance}
                                 details={d} singleDetails={details.length === 1} onClick={clickDetails}
                />
            ))}
        </group>
    )
}
