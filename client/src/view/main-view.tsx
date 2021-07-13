/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter, WorldFeature } from "eig"
import * as React from "react"
import { useEffect } from "react"
import { useRecoilState } from "recoil"
import { Vector3 } from "three"

import { ConstructionView } from "../construction/construction-view"
import { EvoView } from "../evo/evo-view"
import { GlobalMode, globalModeFromUrl, reloadGlobalMode } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { SPHERE_RADIUS, SphereView } from "../sphere/sphere-view"
import { TensegritySphere } from "../sphere/tensegrity-sphere"
import { globalModeAtom } from "../storage/recoil"

import { DesignView } from "./design-view"

export function MainView({createInstance}: { createInstance: CreateInstance }): JSX.Element {

    const [globalMode] = useRecoilState(globalModeAtom)
    useEffect(() => {
        const urlMode = globalModeFromUrl()
        if (urlMode !== globalMode) {
            reloadGlobalMode(urlMode)
        }
    }, [])

    switch (globalMode) {
        case GlobalMode.Halo:
        case GlobalMode.Convergence:
        case GlobalMode.HeadlessHug:
            return (
                <ConstructionView globalMode={globalMode} createInstance={createInstance}/>
            )
        case GlobalMode.Evolution:
            return (
                <EvoView createBodyInstance={createInstance}/>
            )
        case GlobalMode.Sphere:
            return (
                <SphereView createSphere={(frequency: number, useGravity: boolean) => {
                    const sphereInstance = createInstance(SurfaceCharacter.Bouncy, {
                        [WorldFeature.IterationsPerFrame]: 200,
                        [WorldFeature.Gravity]: 1000,
                        [WorldFeature.VisualStrain]: 0,
                        [WorldFeature.StiffnessFactor]: 800,
                    })
                    return new TensegritySphere(
                        new Vector3(0, 3, 0),
                        SPHERE_RADIUS, frequency, 0.3333, useGravity, sphereInstance,
                    )
                }}/>
            )
        default:
            return (
                <DesignView createInstance={createInstance}/>
            )
    }
}
