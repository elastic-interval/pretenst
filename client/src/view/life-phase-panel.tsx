/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowRight, FaClock, FaHammer, FaHandSpock, FaSeedling, FaTools, FaYinYang } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, LifePhase } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IStoredState } from "../storage/stored-state"

export function LifePhasePanel({fabric, lifePhase$, storedState$, disabled}: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject<LifePhase>,
    storedState$: BehaviorSubject<IStoredState>,
    disabled: boolean,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    const [featureValues, setFeatureValues] = useState(storedState$.getValue().featureValues)
    useEffect(() => {
        const subscription = [
            lifePhase$.subscribe(newPhase => setLifePhase(newPhase)),
            storedState$.subscribe(newState => setFeatureValues(newState.featureValues)),
        ]
        return () => subscription.forEach(s => s.unsubscribe())
    }, [])

    function LifePhaseIcon(): JSX.Element {
        switch (lifePhase) {
            case LifePhase.Growing:
                return <h4><FaSeedling/> Growing <FaSeedling/></h4>
            case LifePhase.Shaping:
                return <h4><FaTools/> Shaping <FaTools/></h4>
            case LifePhase.Slack:
                return <h4><FaYinYang/> Slack <FaYinYang/></h4>
            case LifePhase.Pretensing:
                return <h4><FaYinYang/> Pretensing <FaYinYang/></h4>
            case LifePhase.Pretenst:
                return <h4><FaHandSpock/> Pretenst <FaHandSpock/></h4>
            case LifePhase.Busy:
                return <h4><FaClock/> Pretenst <FaHandSpock/></h4>
        }
    }

    return (
        <div className="my-4 w-100">
            <div className="text-center">
                <LifePhaseIcon/>
            </div>
            <ButtonGroup vertical={true} className="w-100">
                <Button disabled={lifePhase !== LifePhase.Shaping || disabled} onClick={() => fabric.toSlack()}>
                    <span>Shaping <FaHammer/> <FaArrowRight/> Slack <FaYinYang/></span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Slack || disabled}
                        onClick={() => fabric.fromSlackToPretensing()}>
                    <span>Slack <FaYinYang/> <FaArrowRight/> Pretenst <FaHandSpock/></span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Slack || disabled}
                        onClick={() => fabric.fromSlackToShaping()}>
                    <span>Slack <FaYinYang/> <FaArrowRight/> Shaping <FaHammer/></span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Pretenst || disabled} onClick={() => {
                    const pushStrainFactor = featureValues[FabricFeature.PushStrainFactor].numeric
                    const pretensingIntensity = featureValues[FabricFeature.PretenseIntensity].numeric
                    fabric.fromStrainsToStiffnesses(pushStrainFactor, pretensingIntensity)
                }}>
                    <span>Pretenst <FaHandSpock/> Strain <FaArrowRight/> Slack <FaYinYang/> Stiffness</span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Pretenst || disabled} onClick={() => fabric.toSlack()}>
                    <span>Pretenst <FaHandSpock/> <FaArrowRight/> Slack <FaYinYang/></span>
                </Button>
            </ButtonGroup>
        </div>
    )
}
