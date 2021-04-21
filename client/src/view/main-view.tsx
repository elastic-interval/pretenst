/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter } from "eig"
import * as React from "react"
import { useEffect } from "react"
import { useRecoilState } from "recoil"
import { Vector3 } from "three"

import { EvolutionView } from "../evo/evolution-view"
import { GlobalMode, globalModeFromUrl, reloadGlobalMode } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { SPHERE_RADIUS, SphereView } from "../sphere/sphere-view"
import { TensegritySphere } from "../sphere/tensegrity-sphere"
import { globalModeAtom } from "../storage/recoil"

import { DesignView } from "./design-view"

export function MainView({createDesignInstance, createSphereInstance, createBodyInstance}: {
    createDesignInstance: CreateInstance,
    createSphereInstance: CreateInstance,
    createBodyInstance: CreateInstance,
}): JSX.Element {

    const [globalMode] = useRecoilState(globalModeAtom)
    useEffect(() => {
        const urlMode = globalModeFromUrl()
        if (urlMode !== globalMode) {
            reloadGlobalMode(urlMode)
        }
    }, [])

    switch (globalMode) {
        case GlobalMode.Evolution:
            return (
                <EvolutionView createBodyInstance={createBodyInstance}/>
            )
        case GlobalMode.Sphere:
            return (
                <SphereView createSphere={(frequency: number) => {
                    const sphereInstance = createSphereInstance(SurfaceCharacter.Bouncy)
                    return new TensegritySphere(
                        new Vector3(0, 3, 0),
                        SPHERE_RADIUS, frequency, 0.3333, sphereInstance,
                    )
                }}/>
            )
        default:
            return (
                <DesignView createInstance={createDesignInstance}/>
            )
    }
}
