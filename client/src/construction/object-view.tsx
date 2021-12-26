/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { OrbitControls, Stars } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { Stage } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { useRecoilState } from "recoil"
import { Color, Vector3 } from "three"

import { Tensegrity } from "../fabric/tensegrity"
import { IIntervalDetails } from "../fabric/tensegrity-types"
import { rotatingAtom, selectedTwistAtom, ViewMode, viewModeAtom } from "../storage/recoil"
import { LiveView } from "../view/live-view"
import { LookView } from "../view/look-view"
import { SelectView } from "../view/select-view"
import { SurfaceComponent } from "../view/surface-component"

const TOWARDS_TARGET = 0.1
const TOWARDS_POSITION = 0.1

export function ObjectView({tensegrity, clickDetails}: {
    tensegrity: Tensegrity,
    clickDetails: (details: IIntervalDetails) => void,
}): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [selected] = useRecoilState(selectedTwistAtom)
    const [aim, setAim] = useState(new Vector3())
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    const [rotating] = useRecoilState(rotatingAtom)
    useFrame(state => {
        if (viewMode === ViewMode.Time) {
            tensegrity.iterate()
        }
        const midpoint = selected ? tensegrity.instance.twistLocation(selected) : tensegrity.instance.midpoint
        const toMidpoint = new Vector3().subVectors(midpoint, aim).multiplyScalar(TOWARDS_TARGET)
        if (viewMode === ViewMode.Time || toMidpoint.lengthSq() > 0.001) {
            setAim(new Vector3().copy(aim).add(toMidpoint))
        }
        if (stage === Stage.Growing) {
            state.camera.position.y += (midpoint.y - state.camera.position.y) * TOWARDS_POSITION
            const distanceChange = state.camera.position.distanceTo(midpoint) - tensegrity.instance.view.radius() * 1.5
            const towardsDistance = new Vector3().subVectors(midpoint, state.camera.position).normalize().multiplyScalar(distanceChange * TOWARDS_POSITION)
            state.camera.position.add(towardsDistance)
        } else {
            if (state.camera.position.y < 0) {
                state.camera.position.y -= state.camera.position.y * TOWARDS_POSITION * 20
            }
        }

    })
    const Rendering = () => {
        switch (viewMode) {
            case ViewMode.Time:
                return <LiveView tensegrity={tensegrity}/>
            case ViewMode.Select:
                return <SelectView tensegrity={tensegrity} clickDetails={clickDetails}/>
            case ViewMode.Look:
                return <LookView tensegrity={tensegrity}/>
        }
    }
    return (
        <group>
            <OrbitControls autoRotate={rotating} target={aim} zoomSpeed={0.5}/>
            <scene>
                <Rendering/>
                <SurfaceComponent/>
                <Stars/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}
