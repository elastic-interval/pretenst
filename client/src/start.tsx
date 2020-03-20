/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"

import { createFloatFeatures, featureConfig, FloatFeature } from "./fabric/fabric-features"
import { FabricInstance } from "./fabric/fabric-instance"
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

export async function startReact(eig: typeof import("eig")): Promise<void> {
    const root = document.getElementById("root") as HTMLElement
    const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_fabric_feature))
    storedState$.subscribe(newState => saveState(newState))
    const floatFeatures = createFloatFeatures(storedState$, eig.default_fabric_feature)
    if (GOTCHI) {
        const island = createIsland(eig, floatFeatures, storedState$)
        ReactDOM.render(<GotchiView eig={eig} island={island}/>, root)
    } else {
        ReactDOM.render(
            <TensegrityView
                eig={eig}
                floatFeatures={floatFeatures}
                storedState$={storedState$}
            />,
            root,
        )
    }
    registerServiceWorker()
}

function createIsland(
    eig: typeof import("eig"),
    floatFeatures: Record<FabricFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
): Island {
    const BODY = "'Gotchi':(A(3,S90,Mb0),b(3,S90,Mb0),a(2,S90,Md0),B(2,Md0,S90)):0=face-distance-60"
    const islandData: IIslandData = {
        name: "Testing",
        hexalots: "1",
        spots: "010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101",
    }

    const gotchiFactory: GotchiFactory = (hexalot, index, rotation, genome) => {
        const instance = new FabricInstance(eig, 100)
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
    return new Island(islandData, gotchiFactory)
}
