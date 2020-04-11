/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { FABRIC_FEATURES } from "./fabric/eig-util"
import { createFloatFeatures, featureConfig } from "./fabric/fabric-features"
import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import { codeToTenscript } from "./fabric/tenscript"
import { Tensegrity } from "./fabric/tensegrity"
import { CreateGotchi, freshGotchiState, Gotchi, IGotchiState } from "./gotchi/gotchi"
import { GotchiView } from "./gotchi/gotchi-view"
import { Island } from "./gotchi/island"
import { IIslandData } from "./gotchi/island-logic"
import registerServiceWorker from "./service-worker"
import { loadState, roleDefaultFromFeatures, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

const GOTCHI = localStorage.getItem("gotchi") === "true"
const ISLAND_DATA: IIslandData = {
    name: "Testing",
    hexalots: "111121",
    spots: "16c10f54db761dfe80f316d646058d888b3c0bfc559d82f2291ea0c19216bae08a8083f093e48e9b37cdb34f01a",
}

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
        const createEmbryo = (instance: FabricInstance, rotation: number) => {
            FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
            // TODO: rotation
            return new Tensegrity(roleLength, numericFeature, instance, tenscript)
        }
        const createGotchi: CreateGotchi = (hexalot, instance, genome, rotation) => {
            const embryo = instance.fabric.age === 0? createEmbryo(instance, rotation): undefined
            const state: IGotchiState = freshGotchiState(hexalot, instance, genome)
            return new Gotchi(state, embryo)
        }
        const island = new Island(ISLAND_DATA, createGotchi)
        ReactDOM.render(
            <GotchiView
                island={island}
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
