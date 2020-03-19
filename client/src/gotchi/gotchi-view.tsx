/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole } from "eig"
import * as React from "react"
import { Canvas } from "react-three-fiber"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { FabricInstance } from "../fabric/fabric-instance"
import { codeToTenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState, roleDefaultFromFeatures } from "../storage/stored-state"

import { Gotchi, GotchiFactory } from "./gotchi"
import { Island } from "./island"
import { IslandComponent } from "./island-component"
import { IIslandData } from "./island-logic"

const BODY = "'Gotchi':(A(2,c(2,MA0)),b(2,c(2,MA0)),a(2,d(2,MA0)),B(2,d(2,MA0))):0=face-distance-115"

export function GotchiView({eig, floatFeatures, storedState$}: {
    eig: typeof import("eig"),
    floatFeatures: Record<FabricFeature, FloatFeature>,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const islandData: IIslandData = {
        name: "Testing",
        hexalots: "",
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
    const island = new Island(islandData, gotchiFactory)

    return (
        <div id="view-container" style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "100%",
        }}>
            <Canvas key={island.name} style={{
                backgroundColor: "black",
                borderStyle: "solid",
                borderColor: "#f0ad4e",
                borderWidth: "2px",
            }}>
                <IslandComponent island={island}/>
            </Canvas>
        </div>
    )
}
