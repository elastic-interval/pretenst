/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { OrbitControls, PerspectiveCamera, Stars } from "react-three-drei-without-subdivision"
import { useFrame } from "react-three-fiber"
import { useRecoilState } from "recoil"
import { Color, Vector3 } from "three"
import { PerspectiveCamera as Cam } from "three/src/cameras/PerspectiveCamera"

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
    const camera = useRef<Cam>()
    useEffect(() => {
        if (!camera.current) {
            return
        }
        camera.current.position.set(0, 5, tensegrity.instance.view.radius() * 5)
    },[])
    useFrame(() => {
        if (viewMode === ViewMode.Time) {
            const busy = tensegrity.iterate()
            if (!busy && tensegrity.stage === Stage.Pretensing) {
                tensegrity.stage = Stage.Pretenst
            }
        }
        const midpoint = selected ? tensegrity.instance.twistLocation(selected) : tensegrity.instance.midpoint
        const toMidpoint = new Vector3().subVectors(midpoint, aim).multiplyScalar(TOWARDS_TARGET)
        if (viewMode === ViewMode.Time || toMidpoint.lengthSq() > 0.001) {
            setAim(new Vector3().copy(aim).add(toMidpoint))
        }
        if (!camera.current) {
            return
        }
        const eye = camera.current.position
        if (stage === Stage.Growing) {
            eye.y += (midpoint.y - eye.y) * TOWARDS_POSITION
            const distanceChange = eye.distanceTo(midpoint) - tensegrity.instance.view.radius() * 2.5
            const towardsDistance = new Vector3().subVectors(midpoint, eye).normalize().multiplyScalar(distanceChange * TOWARDS_POSITION)
            eye.add(towardsDistance)
        } else {
            if (eye.y < 0) {
                eye.y -= eye.y * TOWARDS_POSITION * 20
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
            <PerspectiveCamera ref={camera} makeDefault={true}/>
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
