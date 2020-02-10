/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowRight,
    FaBaby,
    FaCamera,
    FaChartBar,
    FaClock,
    FaHandSpock,
    FaList,
    FaSeedling,
    FaTools,
    FaYinYang,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export enum StageTransition {
    CaptureLengthsToSlack,
    CurrentLengthsToSlack,
    SlackToRealizing,
    SlackToShaping,
    CaptureRealizedToSlack,
    CaptureStrainForStiffness,
}

export function LifeStageButton({fabric, stageTransition, disabled}: {
    fabric: TensegrityFabric,
    stageTransition: StageTransition,
    disabled: boolean,
}): JSX.Element {

    const [life, updateLife] = useState(fabric.life)
    useEffect(() => {
        const sub = fabric.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [fabric])

    function allDisabledExcept(stageAccepted: Stage): boolean {
        if (disabled || life.stage === Stage.Busy || life.stage === Stage.Realizing) {
            return true
        }
        return life.stage !== stageAccepted
    }

    switch (stageTransition) {
        case StageTransition.CaptureLengthsToSlack:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Shaping)}
                    onClick={() => fabric.toStage(Stage.Slack, {adoptLengths: true})}
                >
                    Capture Lengths <FaCamera/> (
                    <Symbol stage={Stage.Shaping}/> ) <FaArrowRight/> ( <FaBaby/><Symbol stage={Stage.Slack}/> )
                    New Slack
                </Button>
            )
        case StageTransition.CurrentLengthsToSlack:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Shaping)}
                    onClick={() => fabric.toStage(Stage.Slack)}
                >
                    Current Lengths <Symbol stage={Stage.Shaping}/> <FaArrowRight/>
                    <Symbol stage={Stage.Slack}/> Slack
                </Button>
            )
        case StageTransition.SlackToRealizing:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Slack)}
                    onClick={() => fabric.toStage(Stage.Realizing)}
                >
                    Slack <Symbol stage={Stage.Slack}/> <FaArrowRight/> <Symbol stage={Stage.Realized}/> Realized
                </Button>
            )
        case StageTransition.SlackToShaping:
            return (
                <ButtonGroup vertical={true} className="w-100 my-1">
                    <Button
                        className="my-1 w-100"
                        disabled={allDisabledExcept(Stage.Slack)}
                        onClick={() => fabric.toStage(Stage.Shaping)}
                    >
                        Slack <Symbol stage={Stage.Slack}/> <FaArrowRight/> <Symbol stage={Stage.Shaping}/> Shaping
                    </Button>
                </ButtonGroup>
            )
        case StageTransition.CaptureRealizedToSlack:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Realized)}
                    onClick={() => fabric.toStage(Stage.Slack, {adoptLengths: true})}
                >
                    Capture realized <FaCamera/> ( <Symbol stage={Stage.Realized}/> ) <FaArrowRight/> ( <FaBaby/>
                    <Symbol stage={Stage.Slack}/> ) New Slack
                </Button>
            )
        case StageTransition.CaptureStrainForStiffness:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Realized)}
                    onClick={() => fabric.toStage(Stage.Slack, {strainToStiffness: true})}
                >
                    Capture Strain <FaCamera/> ( <Symbol stage={Stage.Realized}/> <FaList/> ) <FaArrowRight/>
                    ( <Symbol stage={Stage.Slack}/> <FaChartBar/> ) Slack Stiffness
                </Button>
            )
    }
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
        default:
            throw new Error("Stage?")
    }
}

// function stageName(stage: Stage): string {
//     switch (stage) {
//         case Stage.Busy:
//             return "Busy"
//         case Stage.Growing:
//             return "Growing"
//         case Stage.Shaping:
//             return "Shaping"
//         case Stage.Slack:
//             return "Slack"
//         case Stage.Realizing:
//             return "Realizing"
//         case Stage.Realized:
//             return "Realized"
//     }
// }
