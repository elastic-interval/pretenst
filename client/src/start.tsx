/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { BridgeView } from "./bridge/bridge-view"
import { FABRIC_FEATURES } from "./fabric/eig-util"
import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import { createFloatFeatures, featureConfig } from "./fabric/float-feature"
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
const BRIDGE = localStorage.getItem("bridge") === "true"

const GOTCHI_TENSCRIPT = "'Gotchi':(A(4,S80,Mc0),b(4,S80,Mc0),a(2,S60,Md0),B(2,S60,Md0)):0=face-distance-55"
// const SATOSHI_TREE_TENSCRIPT = "'Satoshi Tree':(2,S85,b(4,S85,MA0),c(4,S85,MA0),d(4,S85,MA0)):0=subtree(b(3, S85),c(3, S85),d(3, S85))"
const SATOSHI_TREE_TENSCRIPT = "'Satoshi Tree':(2,b(6,S85),c(6,S85),d(6,S85))"

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
        const gotchiNumericFeature = (feature: WorldFeature) => {
            const defaultValue = eig.default_fabric_feature(feature)
            switch (feature) {
                case WorldFeature.Gravity:
                    return defaultValue * 3
                case WorldFeature.Antigravity:
                    return defaultValue * 0.3
                case WorldFeature.Drag:
                    return defaultValue * 0.7
                case WorldFeature.IntervalCountdown:
                    return defaultValue * 0.5
                case WorldFeature.PretensingCountdown:
                    return defaultValue * 0.7
                case WorldFeature.MaxStrain:
                    return defaultValue * 0.2
                case WorldFeature.StiffnessFactor:
                    return defaultValue * 10
                case WorldFeature.PretenstFactor:
                    return defaultValue * 2
                case WorldFeature.SlackThreshold:
                    return 0
                default:
                    return defaultValue
            }
        }
        const satoshiTreeNumericFeature = (feature: WorldFeature) => {
            const defaultValue = eig.default_fabric_feature(feature)
            switch (feature) {
                case WorldFeature.Gravity:
                    return defaultValue * 5
                case WorldFeature.IntervalCountdown:
                    return defaultValue * 0.1
                case WorldFeature.Antigravity:
                    return defaultValue * 0.3
                case WorldFeature.Drag:
                    return 0
                case WorldFeature.PretenstFactor:
                    return defaultValue * 5
                case WorldFeature.StiffnessFactor:
                    return defaultValue * 8
                case WorldFeature.PretensingCountdown:
                    return defaultValue * 0.02
                default:
                    return defaultValue
            }
        }
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(gotchiNumericFeature, role)
        const createTensegrity = (
            instance: FabricInstance,
            numericFeature: (feature: WorldFeature) => number,
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
    } else if (BRIDGE) {
        const C = 7
        const W = 2.5
        const L = 6
        const S = 95
        const R = 2.5
        const numericFeature = (feature: WorldFeature) => {
            const defaultValue = eig.default_fabric_feature(feature)
            switch (feature) {
                case WorldFeature.IterationsPerFrame:
                    return defaultValue * 2
                case WorldFeature.Gravity:
                    return defaultValue * 0.4
                case WorldFeature.Drag:
                    return defaultValue * 5
                case WorldFeature.ShapingStiffnessFactor:
                    return defaultValue * 2
                case WorldFeature.PushRadius:
                    return defaultValue * 3
                case WorldFeature.PullRadius:
                    return defaultValue * 2
                case WorldFeature.JointRadius:
                    return defaultValue * 0.8
                case WorldFeature.PretensingCountdown:
                    return defaultValue * 5
                case WorldFeature.MaxStrain:
                    return defaultValue * 0.1
                case WorldFeature.PretenstFactor:
                    return defaultValue * 0.3
                case WorldFeature.StiffnessFactor:
                    return defaultValue * 60.0
                case WorldFeature.PushOverPull:
                    return 0.25
                case WorldFeature.RibbonLongLength:
                    return defaultValue * R * 0.66
                case WorldFeature.RibbonPushLength:
                case WorldFeature.RibbonShortLength:
                    return defaultValue * R
                default:
                    return defaultValue
            }
        }
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(numericFeature, role)
        const instance = createInstance(true)
        FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
        const code = `'Melkvonder Ulft':(A(${C},S${S},MA0),b(${C},S${S},MA1),a(${C},S${S},MA3),B(${C},S${S},MA2)):0=anchor-(${L},${W}):1=anchor-(${L},-${W}):2=anchor-(-${L},${W}):3=anchor-(-${L},-${W})`
        const tensegrity = new Tensegrity(new Vector3(), true, 0, roleLength, numericFeature, instance, toTenscript(code))
        ReactDOM.render(<BridgeView tensegrity={tensegrity}/>, root)
    } else {
        const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_fabric_feature))
        storedState$.subscribe(newState => saveState(newState))
        const floatFeatures = createFloatFeatures(storedState$, eig.default_fabric_feature)
        ReactDOM.render(<TensegrityView createInstance={createInstance} floatFeatures={floatFeatures}
                                        storedState$={storedState$}/>, root)
    }
    registerServiceWorker()
}
