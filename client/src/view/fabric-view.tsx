/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
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

import { LiveView } from "./live-view"
import { LookView } from "./look-view"
import { SelectView } from "./select-view"
import { SurfaceComponent } from "./surface-component"

const AMBIENT_COLOR = new Color("#ffffff")
const TOWARDS_TARGET = 0.01
const TOWARDS_POSITION = 0.01

export function FabricView({tensegrity, clickDetails}: {
    tensegrity: Tensegrity,
    clickDetails: (details: IIntervalDetails) => void,
}): JSX.Element {

    const [viewMode] = useRecoilState(viewModeAtom)
    const [rotating] = useRecoilState(rotatingAtom)
    const [selected] = useRecoilState(selectedTwistAtom)

    const [aim, updateAim] = useState(new Vector3(0, 1, 0))
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())

    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])

    useFrame(state => {
        if (viewMode === ViewMode.Time) {
            tensegrity.iterate()
        }
        const midpoint = selected ? tensegrity.instance.twistLocation(selected) : tensegrity.instance.midpoint
        updateAim(new Vector3().subVectors(midpoint, aim).multiplyScalar(TOWARDS_TARGET).add(aim))
        if (stage === Stage.Growing) {
            state.camera.position.y += (midpoint.y - state.camera.position.y) * TOWARDS_POSITION
            const distanceChange = state.camera.position.distanceTo(midpoint) - tensegrity.instance.view.radius() * 2.5
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
            <OrbitControls target={aim} autoRotate={rotating} enablePan={false}  maxDistance={200}
                           enableDamping={false} minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.8}
                           zoomSpeed={0.5}
            />
            <scene>
                <Rendering/>
                <SurfaceComponent/>
                <Stars radius={300}/>
                <ambientLight color={AMBIENT_COLOR} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}
