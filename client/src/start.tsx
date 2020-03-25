/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { createFloatFeatures, featureConfig, FloatFeature } from "./fabric/fabric-features"
import { FabricInstance, InstanceFactory } from "./fabric/fabric-instance"
import { codeToTenscript } from "./fabric/tenscript"
import { Tensegrity } from "./fabric/tensegrity"
import { Gotchi, GotchiFactory } from "./gotchi/gotchi"
import { GotchiView } from "./gotchi/gotchi-view"
import { Island } from "./gotchi/island"
import { IIslandData } from "./gotchi/island-logic"
import registerServiceWorker from "./service-worker"
import { IStoredState, loadState, roleDefaultFromFeatures, saveState } from "./storage/stored-state"
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
    const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_fabric_feature))
    storedState$.subscribe(newState => saveState(newState))
    const floatFeatures = createFloatFeatures(storedState$, eig.default_fabric_feature)
    const instanceFactory = () => new FabricInstance(eig, 200, world)
    if (GOTCHI) {
        const island = createIsland(eig, instanceFactory, floatFeatures, storedState$)
        ReactDOM.render(<GotchiView island={island} floatFeatures={floatFeatures}/>, root)
    } else {
        ReactDOM.render(<TensegrityView eig={eig} instanceFactory={instanceFactory} floatFeatures={floatFeatures} storedState$={storedState$}/>, root)
    }
    registerServiceWorker()
}

function createIsland(
    eig: typeof import("eig"),
    instanceFactory: InstanceFactory,
    floatFeatures: Record<FabricFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
): Island {
    const gotchiFactory: GotchiFactory = (hexalot, index, rotation, genome) => {
        const instance = instanceFactory()
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(floatFeatures, role)
        const numericFeature = (feature: FabricFeature) => storedState$.getValue().featureValues[feature].numeric
        const tenscript = codeToTenscript((error: string) => {
            throw new Error(`Unable to compile: ${error}`)
        }, false, BODY)
        if (!tenscript) {
            throw new Error("Unable to build body")
        }
        const tensegrity = new Tensegrity(roleLength, numericFeature, instance, tenscript)
        // todo: rotation
        return new Gotchi(hexalot, index, genome, tensegrity, hexalot.firstLeg)
    }
    return new Island(ISLAND_DATA, gotchiFactory)
}
