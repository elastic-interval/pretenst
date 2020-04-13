/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { FABRIC_FEATURES } from "./fabric/eig-util"
import { createFloatFeatures, featureConfig } from "./fabric/fabric-features"
import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import { codeToTenscript } from "./fabric/tenscript"
import { Tensegrity } from "./fabric/tensegrity"
import { freshGotchiState, Gotchi, IGotchiState, NewGotchi } from "./gotchi/gotchi"
import { GotchiView } from "./gotchi/gotchi-view"
import { Island } from "./gotchi/island"
import registerServiceWorker from "./service-worker"
import { loadState, roleDefaultFromFeatures, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

const GOTCHI = localStorage.getItem("gotchi") === "true"

const BODY = "'Gotchi':(A(2,S90,Mc0),b(2,S90,Mc0),a(2,S90,Md0),B(2,Md0,S90)):0=face-distance-55"

// const BODY = "'Gotchi':(A(3,S90,Mc0),b(3,S90,Mc0),a(3,S90,Md0),B(3,Md0,S90)):0=face-distance-55"

export async function startReact(eig: typeof import("eig"), world: typeof import("eig").World): Promise<void> {
    const root = document.getElementById("root") as HTMLElement
    const createInstance: CreateInstance = (fabric?: object) => new FabricInstance(eig, 200, world, fabric)
    if (GOTCHI) {
        const numericFeature = (feature: FabricFeature) => {
            const defaultValue = eig.default_fabric_feature(feature)
            switch (feature) {
                case FabricFeature.Gravity:
                    return defaultValue * 3
                case FabricFeature.Antigravity:
                    return defaultValue * 0.3
                case FabricFeature.Drag:
                    return defaultValue * 0.7
                case FabricFeature.ShapingStiffnessFactor:
                    return defaultValue * 5
                case FabricFeature.IntervalCountdown:
                    return defaultValue * 2
                case FabricFeature.StiffnessFactor:
                    return defaultValue * 4
                case FabricFeature.RealizingCountdown:
                    return defaultValue * 0.7
                case FabricFeature.MaxStrain:
                    return defaultValue * 0.5
                case FabricFeature.VisualStrain:
                    return defaultValue * 2
                case FabricFeature.PretenstFactor:
                    return defaultValue * 10
                case FabricFeature.SlackThreshold:
                    return 0
                default:
                    return defaultValue
            }
        }
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(numericFeature, role)
        const tenscript = codeToTenscript((error: string) => {
            throw new Error(`Unable to compile: ${error}`)
        }, false, BODY)
        if (!tenscript) {
            throw new Error("Unable to build body")
        }
        const createEmbryo = (instance: FabricInstance, location: Vector3, rotation: number) => {
            FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
            return new Tensegrity(location, true, rotation, roleLength, numericFeature, instance, tenscript)
        }
        const newGotchi: NewGotchi = (patch, instance, genome) => {
            const embryo = instance.fabric.age === 0 ? createEmbryo(instance, patch.center, patch.rotation) : undefined
            const state: IGotchiState = freshGotchiState(patch, instance, genome)
            return new Gotchi(state, embryo)
        }
        const island = new Island(newGotchi, "Pretenst Island", 1001010)
        ReactDOM.render(
            <GotchiView
                island={island}
                homePatch={island.patches[0]}
                createInstance={createInstance}
            />, root)
    } else {
        const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_fabric_feature))
        storedState$.subscribe(newState => saveState(newState))
        const floatFeatures = createFloatFeatures(storedState$, eig.default_fabric_feature)
        ReactDOM.render(
            <TensegrityView
                eig={eig}
                createInstance={createInstance}
                floatFeatures={floatFeatures}
                storedState$={storedState$}
            />, root)
    }
    registerServiceWorker()
}
