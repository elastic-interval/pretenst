/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaClock, FaCompressArrowsAlt, FaFistRaised, FaHandRock, FaParachuteBox } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function LiveTab(
    {
        floatFeatures, tensegrity,
        storedState$,
    }: {
        floatFeatures: Record<WorldFeature, FloatFeature>,
        tensegrity: Tensegrity,
        storedState$: BehaviorSubject<IStoredState>,
    }): JSX.Element {


    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
            updatePolygons(newState.polygons)
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaClock/> Time</h6>
                <FeaturePanel key="it" feature={floatFeatures[WorldFeature.IterationsPerFrame]} disabled={polygons}/>
                <FeaturePanel key="ic" feature={floatFeatures[WorldFeature.IntervalCountdown]} disabled={polygons}/>
                <FeaturePanel key="pc" feature={floatFeatures[WorldFeature.PretensingCountdown]} disabled={polygons}/>
            </Grouping>
            <Grouping>
                <FeaturePanel
                    feature={floatFeatures[WorldFeature.VisualStrain]}
                    disabled={polygons}
                />
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaFistRaised/> Perturb</h6>
                <ButtonGroup className="w-100">
                    <Button disabled={life.stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(1)}>
                        <FaHandRock/> Nudge
                    </Button>
                    <Button disabled={life.stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(10)}>
                        <FaParachuteBox/> Drop
                    </Button>
                    <Button disabled={polygons}
                            onClick={() => tensegrity.fabric.centralize()}>
                        <FaCompressArrowsAlt/> Centralize
                    </Button>
                </ButtonGroup>
            </Grouping>
        </div>
    )
}

