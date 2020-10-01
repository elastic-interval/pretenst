/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaGlobe, FaHandRock, FaParachuteBox } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function LiveTab(
    {worldFeatures, tensegrity, storedState$}: {
        worldFeatures: Record<WorldFeature, FloatFeature>,
        tensegrity: Tensegrity,
        storedState$: BehaviorSubject<IStoredState>,
    }): JSX.Element {

    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    return (
        <div>
            <Grouping>
                <FeaturePanel feature={worldFeatures[WorldFeature.VisualStrain]}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.PushOverPull]}/>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaGlobe/> Pretenst</h6>
                <FeaturePanel feature={worldFeatures[WorldFeature.PretenstFactor]}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.StiffnessFactor]}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.Gravity]}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.Drag]}/>
                <ButtonGroup className="w-100 my-3">
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(1)}>
                        <FaHandRock/> Nudge
                    </Button>
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(10)}>
                        <FaParachuteBox/> Drop
                    </Button>
                </ButtonGroup>
            </Grouping>
        </div>
    )
}

