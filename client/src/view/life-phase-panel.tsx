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

import { Stage } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function LifePhasePanel({fabric, disabled}: {
    fabric: TensegrityFabric,
    disabled: boolean,
}): JSX.Element {

    const [life, updateLife] = useState(fabric.life)
    useEffect(() => {
        const sub = fabric.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [fabric])

    function disabledExcept(stage: Stage): boolean {
        if (disabled) {
            return true
        }
        return life.stage !== stage
    }

    return (
        <div className="d-inline">
            <div className="float-left mx-2 p-2 text-center" style={{
                width: "8em",
                backgroundColor: "#5b5b5b",
                borderRadius: "1em",
            }}>
                <Symbol stage={life.stage}/> {stageName(life.stage)}
            </div>
            <ButtonGroup>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(Stage.Shaping)}
                    onClick={() => fabric.toStage(Stage.Realizing)}
                >
                    <Symbol stage={Stage.Realized}/>
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(Stage.Shaping)}
                    onClick={() => fabric.toStage(Stage.Slack, {adoptLengths: true})}
                >
                    <FaCamera/> <FaArrowRight/> ( <FaBaby/> <Symbol stage={Stage.Slack}/> )
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(Stage.Slack)}
                    onClick={() => fabric.toStage(Stage.Realizing)}
                >
                    <Symbol stage={Stage.Realized}/> <FaArrowDown/>
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(Stage.Slack)}
                    onClick={() => fabric.toStage(Stage.Shaping)}
                >
                    <Symbol stage={Stage.Shaping}/>
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(Stage.Realized)}
                    onClick={() => fabric.toStage(Stage.Slack, {adoptLengths: true})}
                >
                    <FaCamera/> <FaArrowRight/> ( <FaBaby/> <Symbol stage={Stage.Slack}/> )
                </Button>
                <Button
                    className="mx-1"
                    disabled={disabledExcept(Stage.Realized)}
                    onClick={() => fabric.toStage(Stage.Slack, {strainToStiffness: true})}
                >
                    <FaCamera/> <Symbol stage={Stage.Realized}/> <FaArrowRight/>
                    ( <Symbol stage={Stage.Slack}/> <FaChartBar/> )
                </Button>
            </ButtonGroup>
        </div>
    )
}

function Symbol({stage}: { stage: Stage }): JSX.Element {
    switch (stage) {
        case Stage.Busy:
            return <FaClock/>
        case Stage.Growing:
            return <FaSeedling/>
        case Stage.Shaping:
            return <FaTools/>
        case Stage.Slack:
            return <FaYinYang/>
        case Stage.Realizing:
            return <FaClock/>
        case Stage.Realized:
            return <FaHandSpock/>
    }
}

function stageName(stage: Stage): string {
    switch (stage) {
        case Stage.Busy:
            return "Busy"
        case Stage.Growing:
            return "Growing"
        case Stage.Shaping:
            return "Shaping"
        case Stage.Slack:
            return "Slack"
        case Stage.Realizing:
            return "Realizing"
        case Stage.Realized:
            return "Realized"
    }
}
