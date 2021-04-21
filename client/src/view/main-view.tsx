/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter } from "eig"
import * as React from "react"
import { useEffect } from "react"
import { useRecoilState } from "recoil"
import { Vector3 } from "three"

import { GlobalMode, globalModeFromUrl, reloadGlobalMode } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { SphereView } from "../sphere/sphere-view"
import { TensegritySphere } from "../sphere/tensegrity-sphere"
import { globalModeAtom } from "../storage/recoil"

import { TensegrityView } from "./tensegrity-view"

export function MainView({createDesignInstance, createSphereInstance}: {
    createDesignInstance: CreateInstance,
    createSphereInstance: CreateInstance,
}): JSX.Element {

    const [globalMode, setGlobalMode] = useRecoilState(globalModeAtom)
    useEffect(() => {
        const urlMode = globalModeFromUrl()
        if (urlMode !== globalMode) {
            reloadGlobalMode(urlMode)
            setGlobalMode(urlMode)
        }
    }, [])

    switch (globalMode) {
        case GlobalMode.Sphere:
            return (
                <SphereView createSphere={(frequency: number) => {
                    const sphereInstance = createSphereInstance(SurfaceCharacter.Bouncy)
                    return new TensegritySphere(
                        new Vector3(0, 3, 0),
                        1, frequency, 0.3333, sphereInstance,
                    )
                }}/>
            )
        default:
            return (
                <TensegrityView createInstance={createDesignInstance}/>
            )
    }
}
