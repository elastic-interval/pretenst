/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { bridgeNumeric, bridgeTenscript } from "./bridge/bridge-logic"
import { BridgeView } from "./bridge/bridge-view"
import { FABRIC_FEATURES } from "./fabric/eig-util"
import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import { createFloatFeatures, featureConfig } from "./fabric/float-feature"
import { codeToTenscript } from "./fabric/tenscript"
import { Tensegrity } from "./fabric/tensegrity"
import { Genome } from "./gotchi/genome"
import {
    freshGotchiState,
    Gotchi,
    GOTCHI_TENSCRIPT,
    gotchiNumeric,
    IGotchiState,
    SATOSHI_TREE_TENSCRIPT,
    treeNumeric,
} from "./gotchi/gotchi"
import { GotchiView } from "./gotchi/gotchi-view"
import { Island, ISource } from "./gotchi/island"
import { Patch } from "./gotchi/patch"
import { SatoshiTree } from "./gotchi/satoshi-tree"
import registerServiceWorker from "./service-worker"
import { sphereNumeric } from "./sphere/sphere-builder"
import { SphereView } from "./sphere/sphere-view"
import { TensegritySphere } from "./sphere/tensegrity-sphere"
import { loadState, roleDefaultFromFeatures, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

const GOTCHI = localStorage.getItem("gotchi") === "true"
const BRIDGE = localStorage.getItem("bridge") === "true"
const SPHERE = localStorage.getItem("sphere") === "true"

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
        const createTensegrity = (
            instance: FabricInstance,
            numericFeature: (feature: WorldFeature) => number,
            location: Vector3,
            code: string,
            symmetrical: boolean,
            rotation: number,
        ) => {
            const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(numericFeature, role)
            FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
            return new Tensegrity(location, symmetrical, rotation, roleLength, numericFeature, instance, toTenscript(code))
        }
        const source: ISource = {
            newGotchi(patch: Patch, instance: FabricInstance, genome: Genome): Gotchi {
                const embryo = instance.fabric.age !== 0 ? undefined :
                    createTensegrity(
                        instance, (feature: WorldFeature) => gotchiNumeric(feature, eig.default_world_feature(feature)),
                        patch.center, GOTCHI_TENSCRIPT, true, patch.rotation,
                    )
                const state: IGotchiState = freshGotchiState(patch, instance, genome)
                return new Gotchi(state, embryo)
            },
            newSatoshiTree(patch: Patch, instance: FabricInstance): SatoshiTree {
                const tensegrity =
                    createTensegrity(
                        instance, (feature: WorldFeature) => treeNumeric(feature, eig.default_world_feature(feature)),
                        patch.center, SATOSHI_TREE_TENSCRIPT, false, 0,
                    )
                return new SatoshiTree(patch.name, tensegrity)
            },
        }
        const island = new Island(source, "Pretenst Island", 1001010)
        ReactDOM.render(<GotchiView island={island}
                                    homePatch={island.patches[0]}
                                    createInstance={createInstance}/>, root)
    } else if (BRIDGE) {
        const numericFeature = (feature: WorldFeature) => bridgeNumeric(feature, eig.default_world_feature(feature))
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(numericFeature, role)
        const instance = createInstance(true)
        FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
        const tenscript = toTenscript(bridgeTenscript())
        const tensegrity = new Tensegrity(new Vector3(), true, 0, roleLength, numericFeature, instance, tenscript)
        ReactDOM.render(<BridgeView tensegrity={tensegrity}/>, root)
    } else if (SPHERE) {
        const numericFeature = (feature: WorldFeature) => sphereNumeric(feature, eig.default_world_feature(feature))
        const roleLength = (role: IntervalRole) => roleDefaultFromFeatures(numericFeature, role)
        const instance = createInstance(false)
        FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, numericFeature(feature)))
        const sphere = new TensegritySphere(new Vector3(0, 15, 0), roleLength, instance)
        ReactDOM.render(<SphereView sphere={sphere}/>, root)
    } else {
        const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_world_feature))
        storedState$.subscribe(newState => saveState(newState))
        const floatFeatures = createFloatFeatures(storedState$, eig.default_world_feature)
        ReactDOM.render(<TensegrityView createInstance={createInstance}
                                        floatFeatures={floatFeatures}
                                        storedState$={storedState$}/>, root)
    }
    registerServiceWorker()
}
