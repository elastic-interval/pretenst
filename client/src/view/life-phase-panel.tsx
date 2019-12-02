/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
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

import { LifePhase } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

function Symbol({phase}: { phase: LifePhase }): JSX.Element {
    switch (phase) {
        case LifePhase.Busy:
            return <FaClock/>
        case LifePhase.Growing:
            return <FaSeedling/>
        case LifePhase.Shaping:
            return <FaTools/>
        case LifePhase.Slack:
            return <FaYinYang/>
        case LifePhase.Realizing:
            return <FaClock/>
        case LifePhase.Realized:
            return <FaHandSpock/>
    }
}

function lifePhaseName(lifePhase: LifePhase): string {
    switch (lifePhase) {
        case LifePhase.Busy:
            return "Busy"
        case LifePhase.Growing:
            return "Growing"
        case LifePhase.Shaping:
            return "Shaping"
        case LifePhase.Slack:
            return "Slack"
        case LifePhase.Realizing:
            return "Realizing"
        case LifePhase.Realized:
            return "Realized"
    }
}

export function LifePhasePanel({fabric, lifePhase$, disabled}: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject<LifePhase>,
    disabled: boolean,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = [
            lifePhase$.subscribe(newPhase => setLifePhase(newPhase)),
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
                width: "8em",
                backgroundColor: "#5b5b5b",
                borderRadius: "1em",
            }}>
                <Symbol phase={lifePhase}/> {lifePhaseName(lifePhase)}
            </div>
            <ButtonGroup>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(LifePhase.Shaping)}
                    onClick={() => fabric.toSlack()}
                >
                    <Symbol phase={LifePhase.Slack}/>
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(LifePhase.Shaping)}
                    onClick={() => fabric.snapshotShape()}
                >
                    <FaCamera/>
                    <FaArrowRight/>
                    ( <FaBaby/> <Symbol phase={LifePhase.Slack}/> )
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(LifePhase.Slack)}
                    onClick={() => fabric.toRealized()}
                >
                    <Symbol phase={LifePhase.Realized}/>
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(LifePhase.Slack)}
                    onClick={() => fabric.toShaping()}
                >
                    <Symbol phase={LifePhase.Shaping}/>
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(LifePhase.Realized)}
                    onClick={() => fabric.snapshotShape()}
                >
                    <FaCamera/>
                    <FaArrowRight/>
                    ( <FaBaby/> <Symbol phase={LifePhase.Slack}/> )
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(LifePhase.Realized)}
                    onClick={() => fabric.snapshotStrainToStiffness()}
                >
                    <FaCamera/>
                    <Symbol phase={LifePhase.Realized}/>
                    <FaArrowRight/>
                    ( <Symbol phase={LifePhase.Slack}/> <FaChartBar/> )
                </Button>
            </ButtonGroup>
        </div>
    )
}
