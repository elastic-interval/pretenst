/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowRight,
    FaBaby,
    FaCamera,
    FaChartBar,
    FaClock,
    FaHandSpock,
    FaSeedling,
    FaTools,
    FaYinYang,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, LifePhase } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IStoredState } from "../storage/stored-state"

function Symbol({phase}: { phase: LifePhase }): JSX.Element {
    switch (phase) {
        case LifePhase.Busy:
            return <span><FaClock/></span>
        case LifePhase.Growing:
            return <span><FaSeedling/></span>
        case LifePhase.SlackShaping:
            return <span>( <FaYinYang/> <FaTools/> )</span>
        case LifePhase.PretenstShaping:
            return <span>( <FaHandSpock/> <FaTools/> )</span>
        case LifePhase.Slack:
            return <span><FaYinYang/></span>
        case LifePhase.PretensingToGravity:
            return <span><FaYinYang/> <FaArrowRight/> ( <FaArrowDown/> <FaHandSpock/> )</span>
        case LifePhase.PretensingToShaping:
            return <span><FaYinYang/> <FaArrowRight/> ( <FaYinYang/> <FaTools/> )</span>
        case LifePhase.Unpretensing:
            return <span><FaHandSpock/> <FaArrowRight/> ( <FaYinYang/> <FaTools/> )</span>
        case LifePhase.PretenstGravity:
            return <span>( <FaHandSpock/> <FaArrowDown/> )</span>
    }
}

function lifePhaseName(lifePhase: LifePhase): string {
    switch (lifePhase) {
        case LifePhase.Growing:
            return "Growing"
        case LifePhase.SlackShaping:
            return "Slack Shaping"
        case LifePhase.PretenstShaping:
            return "Pretenst Shaping"
        case LifePhase.Slack:
            return "Slack"
        case LifePhase.PretensingToGravity:
            return "To Gravity"
        case LifePhase.PretensingToShaping:
            return "To Shaping"
        case LifePhase.Unpretensing:
            return "To Shaping"
        case LifePhase.PretenstGravity:
            return "Pretenst Gravity"
        case LifePhase.Busy:
            return "Busy"
    }
}

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

    function disabledExcept(liveLifePhase: LifePhase): boolean {
        if (disabled) {
            return true
        }
        return lifePhase !== liveLifePhase
    }

    return (
        <div className="d-inline">
            <div className="float-left mx-2 p-2 text-center" style={{
                width: "15em",
                backgroundColor: "#5b5b5b",
                borderRadius: "1em",
            }}>
                <Symbol phase={lifePhase}/> {lifePhaseName(lifePhase)}
            </div>
            <ButtonGroup>
                <Button
                    disabled={disabledExcept(LifePhase.SlackShaping)}
                    onClick={() => fabric.toSlack(false)}
                >
                    <Symbol phase={LifePhase.SlackShaping}/>
                    <FaArrowRight/>
                    <Symbol phase={LifePhase.Slack}/>
                </Button>
                <Button
                    disabled={disabledExcept(LifePhase.SlackShaping)}
                    onClick={() => fabric.toPretensing(false)}
                >
                    <Symbol phase={LifePhase.SlackShaping}/>
                    <FaArrowRight/>
                    <Symbol phase={LifePhase.PretenstShaping}/>
                </Button>
                <Button
                    disabled={disabledExcept(LifePhase.PretenstShaping)}
                    onClick={() => fabric.toSlack(false)}
                >
                    <Symbol phase={LifePhase.PretenstShaping}/>
                    <FaArrowRight/>
                    <Symbol phase={LifePhase.Slack}/>
                </Button>
                <Button
                    disabled={disabledExcept(LifePhase.Slack)}
                    onClick={() => fabric.toPretensing(true)}
                >
                    <Symbol phase={LifePhase.Slack}/>
                    <FaArrowRight/>
                    <Symbol phase={LifePhase.PretenstGravity}/>
                </Button>
                <Button
                    disabled={disabledExcept(LifePhase.Slack)}
                    onClick={() => fabric.toShaping(false)}
                >
                    <Symbol phase={LifePhase.Slack}/>
                    <FaArrowRight/>
                    <Symbol phase={LifePhase.SlackShaping}/>
                </Button>
                <Button
                    disabled={disabledExcept(LifePhase.Slack)}
                    onClick={() => fabric.toShaping(true)}
                >
                    <Symbol phase={LifePhase.Slack}/>
                    <FaArrowRight/>
                    <Symbol phase={LifePhase.PretenstShaping}/>
                </Button>
                <Button
                    disabled={disabledExcept(LifePhase.PretenstShaping)}
                    onClick={() => fabric.toSlack(true)}
                >
                    <FaCamera/>
                    <Symbol phase={LifePhase.PretenstShaping}/>
                    <FaArrowRight/>
                    ( <FaBaby/> <Symbol phase={LifePhase.Slack}/> )
                </Button>
                <Button
                    disabled={disabledExcept(LifePhase.PretenstGravity)}
                    onClick={() => {
                        const pushStrainFactor = featureValues[FabricFeature.PushStrainFactor].numeric
                        fabric.fromStrainsToStiffnesses(pushStrainFactor, 1)
                    }}
                >
                    <FaCamera/>
                    <Symbol phase={LifePhase.PretenstShaping}/>
                    <FaArrowRight/>
                    ( <Symbol phase={LifePhase.Slack}/> <FaChartBar/> )
                </Button>
            </ButtonGroup>
        </div>
    )
}
