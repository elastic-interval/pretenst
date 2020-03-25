/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature } from "eig"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { Canvas } from "react-three-fiber"
import { Button, ButtonGroup } from "reactstrap"

import { FloatFeature } from "../fabric/fabric-features"
import { InstanceFactory } from "../fabric/fabric-instance"
import { IFeatureValue } from "../storage/stored-state"

import { Evolution } from "./evolution"
import { Island } from "./island"
import { IslandView } from "./island-view"

export function GotchiView({island, instanceFactory, floatFeatures}: {
    island: Island,
    instanceFactory: InstanceFactory,
    floatFeatures: Record<FabricFeature, FloatFeature>,
}): JSX.Element {

    const gotchi = useMemo(() => island.hexalots[0].createNativeGotchi(instanceFactory()), [])
    const [evolution, updateEvolution] = useState<Evolution | undefined>(undefined)

    useEffect(() => {
        const featureSubscriptions = Object.keys(floatFeatures).map(k => floatFeatures[k]).map((feature: FloatFeature) =>
            feature.observable.subscribe((value: IFeatureValue) => {
                if (!gotchi) {
                    return
                }
                gotchi.instance.applyFeature(feature)
            }))
        return () => featureSubscriptions.forEach(sub => sub.unsubscribe())
    }, [gotchi, evolution])

    const onClickEvolve = () => {
        if (gotchi) {
            const evo = new Evolution(gotchi.hexalot, instanceFactory)
            console.log("Evolving gotchis", evo.evolvers.length)
            updateEvolution(evo)
        }
    }
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
                <IslandView island={island} gotchi={gotchi} evolution={evolution}/>
            </Canvas>
            <div id="bottom-middle">
                <ButtonGroup>
                    <Button key={`evolve`} onClick={onClickEvolve}>Evolve!</Button>
                </ButtonGroup>
            </div>
        </div>
    )
}

