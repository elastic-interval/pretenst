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
import { FabricInstance } from "./fabric/fabric-instance"
import { codeToTenscript } from "./fabric/tenscript"
import { Tensegrity } from "./fabric/tensegrity"
import { Gotchi, GotchiFactory } from "./gotchi/gotchi"
import { GotchiView } from "./gotchi/gotchi-view"
import { Island } from "./gotchi/island"
import { IIslandData } from "./gotchi/island-logic"
import registerServiceWorker from "./service-worker"
import { loadState, roleDefaultFromFeatures, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

const GOTCHI = localStorage.getItem("gotchi") === "true"
const BODY = "'Gotchi':(A(3,S90,Mb0),b(3,S90,Mb0),a(2,S90,Md0),B(2,Md0,S90)):0=face-distance-60"
const ISLAND_DATA: IIslandData = {
    name: "Testing",
    hexalots: "111121",
    spots: "16c10f54db761dfe80f316d646058d888b3c0bfc559d82f2291ea0c19216bae08a8083f093e48e9b37cdb34f01a",
}

export async function startReact(eig: typeof import("eig"), world: typeof import("eig").World): Promise<void> {
    const root = document.getElementById("root") as HTMLElement
    const instanceFactory = () => new FabricInstance(eig, 200, world)
    if (GOTCHI) {
        const gotchiFactory: GotchiFactory = (hexalot, instance, rotation, genome) => {
            const numericFeature = (feature: FabricFeature) => {
                const defaultValue = eig.default_fabric_feature(feature)
                switch (feature) {
                    case FabricFeature.Gravity:
                        return defaultValue
                    case FabricFeature.Drag:
                        return defaultValue * 2
                    case FabricFeature.ShapingStiffnessFactor:
                        return defaultValue * 5
                    case FabricFeature.IntervalCountdown:
                        return defaultValue * 0.1
                    case FabricFeature.StiffnessFactor:
                        return defaultValue * 2
                    default:
                        return defaultValue
                }
            }
            FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
            const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(numericFeature, role)
            const tenscript = codeToTenscript((error: string) => {
                throw new Error(`Unable to compile: ${error}`)
            }, false, BODY)
            if (!tenscript) {
                throw new Error("Unable to build body")
            }
            instance.clear()
            const tensegrity = new Tensegrity(roleLength, numericFeature, instance, tenscript)
            // todo: rotation
            console.log("new gotchi, genome:", genome.toString())
            return new Gotchi(hexalot, genome, tensegrity, hexalot.firstLeg)
        }
        const island = new Island(ISLAND_DATA, gotchiFactory)
        ReactDOM.render(
            <GotchiView
                island={island}
                instanceFactory={instanceFactory}
            />, root)
    } else {
        const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_fabric_feature))
        storedState$.subscribe(newState => saveState(newState))
        const floatFeatures = createFloatFeatures(storedState$, eig.default_fabric_feature)
        ReactDOM.render(
            <TensegrityView
                eig={eig}
                instanceFactory={instanceFactory}
                floatFeatures={floatFeatures}
                storedState$={storedState$}
            />, root)
    }
    registerServiceWorker()
}
