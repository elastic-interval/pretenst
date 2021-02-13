/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { FABRIC_FEATURES, Version, versionFromUrl } from "./fabric/eig-util"
import { CreateInstance, FabricInstance } from "./fabric/fabric-instance"
import { createFloatFeatures, featureConfig } from "./fabric/float-feature"
import { compileTenscript, ITenscript } from "./fabric/tenscript"
import { Tensegrity } from "./fabric/tensegrity"
import { percentOrHundred } from "./fabric/tensegrity-types"
import { Genome } from "./gotchi/genome"
import {
    freshGotchiState,
    Gotchi,
    GOTCHI_CODE,
    gotchiNumeric,
    IGotchiState,
    SATOSHI_TREE_CODE,
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
import { loadState, saveState } from "./storage/stored-state"
import { TensegrityView } from "./view/tensegrity-view"

function render(element: JSX.Element): void {
    const root = document.getElementById("root") as HTMLElement
    ReactDOM.render(element, root)
}

export async function startReact(
    eig: typeof import("eig"),
    stickyWorld: typeof import("eig").World,
    frozenWorld: typeof import("eig").World,
): Promise<void> {
    const createInstance: CreateInstance = (frozen: boolean, fabric?: object) => (
        new FabricInstance(eig, 2000, frozen ? frozenWorld : stickyWorld, fabric)
    )
    switch (versionFromUrl()) {
        case Version.Gotchi:
            location.hash = "gotchi"
            const createTensegrity = (
                instance: FabricInstance,
                gotchiValue: (feature: WorldFeature) => number,
                gotchiLocation: Vector3,
                tenscript: ITenscript,
            ) => {
                FABRIC_FEATURES.forEach(feature => instance.world.set_float_value(feature, gotchiValue(feature)))
                compileTenscript(tenscript, (error: string) => {
                    throw new Error(`Unable to compile: ${error}`)
                })
                return new Tensegrity(gotchiLocation, percentOrHundred(), gotchiValue, instance, tenscript)
            }
            const source: ISource = {
                newGotchi(patch: Patch, instance: FabricInstance, genome: Genome): Gotchi {
                    const state: IGotchiState = freshGotchiState(patch, instance, genome)
                    return new Gotchi(state, instance.fabric.age !== 0 ? undefined :
                        createTensegrity(
                            instance, (feature: WorldFeature) => gotchiNumeric(feature, eig.default_world_feature(feature)),
                            patch.center, GOTCHI_CODE,
                        ))
                },
                newSatoshiTree(patch: Patch, instance: FabricInstance): SatoshiTree {
                    return new SatoshiTree(patch.name, createTensegrity(
                        instance, (feature: WorldFeature) => treeNumeric(feature, eig.default_world_feature(feature)),
                        patch.center, SATOSHI_TREE_CODE,
                    ))
                },
            }
            const island = new Island(source, "Pretenst Island", 1001010)
            render(<GotchiView island={island}
                               homePatch={island.patches[0]}
                               createInstance={createInstance}/>)
            break
        case Version.Sphere:
            const numeric = (feature: WorldFeature) => sphereNumeric(feature, eig.default_world_feature(feature))
            const at = new Vector3(0, 3, 0)
            const createSphere = (frequency: number) => {
                const sphereInstance = createInstance(false)
                FABRIC_FEATURES.forEach(feature => sphereInstance.world.set_float_value(feature, numeric(feature)))
                return new TensegritySphere(at, 0.7, frequency, 0.52, numeric, sphereInstance)
            }
            render(<SphereView createSphere={createSphere}/>)
            break
        default:
            const storedState$ = new BehaviorSubject(loadState(featureConfig, eig.default_world_feature))
            storedState$.subscribe(newState => saveState(newState))
            const floatFeatures = createFloatFeatures(storedState$, eig.default_world_feature)
            render(<TensegrityView createInstance={createInstance}
                                   worldFeatures={floatFeatures}
                                   storedState$={storedState$}/>)
            break
    }
    registerServiceWorker()
}
