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
import { Genome } from "./gotchi/genome"
import { freshGotchiState, Gotchi, IGotchiState } from "./gotchi/gotchi"
import { GotchiView } from "./gotchi/gotchi-view"
import { Island, ISource } from "./gotchi/island"
import { Patch } from "./gotchi/patch"
import { SatoshiTree } from "./gotchi/satoshi-tree"
import registerServiceWorker from "./service-worker"
import { loadState, roleDefaultFromFeatures, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

const GOTCHI = localStorage.getItem("gotchi") === "true"

const GOTCHI_TENSCRIPT = "'Gotchi':(A(4,S80,Mc0),b(4,S80,Mc0),a(2,S60,Md0),B(2,S60,Md0)):0=face-distance-55"
// const SATOSHI_TREE_TENSCRIPT = "'Satoshi Tree':(2,S85,b(4,S85,MA0),c(4,S85,MA0),d(4,S85,MA0)):0=subtree(b(3, S85),c(3, S85),d(3, S85))"
const SATOSHI_TREE_TENSCRIPT = "'Satoshi Tree':(2,b(6,S85),c(6,S85),d(6,S85))"

export async function startReact(
    eig: typeof import("eig"),
    stickyWorld: typeof import("eig").World,
    frozenWorld: typeof import("eig").World,
): Promise<void> {
    const root = document.getElementById("root") as HTMLElement
    const createInstance: CreateInstance = (frozen: boolean, fabric?: object) => (
        new FabricInstance(eig, 200, frozen ? frozenWorld : stickyWorld, fabric)
    )
    if (GOTCHI) {
        const gotchiNumericFeature = (feature: FabricFeature) => {
            const defaultValue = eig.default_fabric_feature(feature)
            switch (feature) {
                case FabricFeature.Gravity:
                    return defaultValue * 3
                case FabricFeature.Antigravity:
                    return defaultValue * 0.3
                case FabricFeature.Drag:
                    return defaultValue * 0.7
                case FabricFeature.IntervalCountdown:
                    return defaultValue * 0.5
                case FabricFeature.RealizingCountdown:
                    return defaultValue * 0.7
                case FabricFeature.MaxStrain:
                    return defaultValue * 0.2
                case FabricFeature.VisualStrain:
                    return defaultValue * 3
                case FabricFeature.StiffnessFactor:
                    return defaultValue * 10
                case FabricFeature.PretenstFactor:
                    return defaultValue * 2
                case FabricFeature.SlackThreshold:
                    return 0
                default:
                    return defaultValue
            }
        }
        const satoshiTreeNumericFeature = (feature: FabricFeature) => {
            const defaultValue = eig.default_fabric_feature(feature)
            switch (feature) {
                case FabricFeature.Gravity:
                    return defaultValue * 5
                case FabricFeature.IntervalCountdown:
                    return defaultValue * 0.1
                case FabricFeature.Antigravity:
                    return defaultValue * 0.3
                case FabricFeature.Drag:
                    return 0
                case FabricFeature.PretenstFactor:
                    return defaultValue * 5
                case FabricFeature.StiffnessFactor:
                    return defaultValue * 8
                case FabricFeature.RealizingCountdown:
                    return defaultValue * 0.02
                default:
                    return defaultValue
            }
        }
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(gotchiNumericFeature, role)
        const tenscriptError = (error: string) => {
            throw new Error(`Unable to compile: ${error}`)
        }
        const toTenscript = (code: string) => {
            const tenscript = codeToTenscript(tenscriptError, false, code)
            if (!tenscript) {
                throw new Error("Unable to build body")
            }
            return tenscript
        }
        const createTensegrity = (
            instance: FabricInstance,
            numericFeature: (feature: FabricFeature) => number,
            location: Vector3,
            code: string,
            symmetrical: boolean,
            rotation: number,
        ) => {
            FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
            return new Tensegrity(location, symmetrical, rotation, roleLength, numericFeature, instance, toTenscript(code))
        }
        const source: ISource = {
            newGotchi(patch: Patch, instance: FabricInstance, genome: Genome): Gotchi {
                const embryo = instance.fabric.age !== 0 ? undefined :
                    createTensegrity(
                        instance, gotchiNumericFeature,
                        patch.center, GOTCHI_TENSCRIPT, true, patch.rotation,
                    )
                const state: IGotchiState = freshGotchiState(patch, instance, genome)
                return new Gotchi(state, embryo)
            },
            newSatoshiTree(patch: Patch, instance: FabricInstance): SatoshiTree {
                const tensegrity =
                    createTensegrity(
                        instance, satoshiTreeNumericFeature,
                        patch.center, SATOSHI_TREE_TENSCRIPT, false, 0,
                    )
                return new SatoshiTree(patch.name, tensegrity)
            },
        }
        const island = new Island(source, "Pretenst Island", 1001010)
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
