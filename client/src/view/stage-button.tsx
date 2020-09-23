/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowLeft,
    FaArrowRight,
    FaBaby,
    FaCamera,
    FaChartBar,
    FaClock,
    FaHandSpock,
    FaList,
    FaSeedling,
    FaSlidersH,
    FaYinYang,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { Tensegrity } from "../fabric/tensegrity"

export enum StageTransition {
    CurrentLengthsToSlack,
    CaptureLengthsToSlack,
    SlackToPretensing,
    SlackToShaping,
    CapturePretenstToSlack,
    CaptureStrainForStiffness,
}

export function StageButton({tensegrity, stageTransition, disabled}: {
    tensegrity: Tensegrity,
    stageTransition: StageTransition,
    disabled: boolean,
}): JSX.Element {

    const [stage, updateStage] = useState(tensegrity.stage)
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])

    function allDisabledExcept(stageAccepted: Stage): boolean {
        if (disabled || stage === Stage.Pretensing) {
            return true
        }
        return stage !== stageAccepted
    }

    switch (stageTransition) {
        case StageTransition.CurrentLengthsToSlack:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Shaping)}
                    onClick={() => tensegrity.do(t => t.stage = Stage.Slack)}
                >
                    Current Lengths <Symbol stage={Stage.Shaping}/> <FaArrowRight/>
                    <Symbol stage={Stage.Slack}/> Slack
                </Button>
            )
        case StageTransition.CaptureLengthsToSlack:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Shaping)}
                    onClick={() => tensegrity.do(t => {
                        t.stage = Stage.Slack
                        t.adoptLengths()
                    })}
                >
                    Capture Lengths <FaCamera/>( <Symbol stage={Stage.Shaping}/> )
                    <FaArrowRight/>
                    ( <FaBaby/><Symbol stage={Stage.Slack}/> )
                    New Slack
                </Button>
            )
        case StageTransition.SlackToPretensing:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Slack)}
                    onClick={() => tensegrity.do(t => t.stage = Stage.Pretensing)}
                >
                    Slack <Symbol stage={Stage.Slack}/> <FaArrowRight/> <Symbol stage={Stage.Pretenst}/> Pretenst
                </Button>
            )
        case StageTransition.SlackToShaping:
            return (
                <ButtonGroup vertical={true} className="w-100 my-1">
                    <Button
                        className="my-1 w-100"
                        disabled={allDisabledExcept(Stage.Slack)}
                        onClick={() => tensegrity.do(t => t.stage = Stage.Shaping)}
                    >
                        <Symbol stage={Stage.Shaping}/> Shaping <FaArrowLeft/> Slack <Symbol stage={Stage.Slack}/>
                    </Button>
                </ButtonGroup>
            )
        case StageTransition.CapturePretenstToSlack:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Pretenst)}
                    onClick={() => tensegrity.do(t => {
                        t.stage = Stage.Slack
                        t.adoptLengths()
                    })}
                >
                    Capture pretenst <FaCamera/> ( <Symbol stage={Stage.Pretenst}/> ) <FaArrowRight/> ( <FaBaby/>
                    <Symbol stage={Stage.Slack}/> ) New Slack
                </Button>
            )
        case StageTransition.CaptureStrainForStiffness:
            return (
                <Button
                    className="my-1 w-100"
                    disabled={allDisabledExcept(Stage.Pretenst)}
                    onClick={() => tensegrity.do(t => {
                        t.stage = Stage.Slack
                        t.strainToStiffness()
                    })}
                >
                    Capture Strain <FaCamera/> ( <Symbol stage={Stage.Pretenst}/> <FaList/> ) <FaArrowRight/>
                    ( <Symbol stage={Stage.Slack}/> <FaChartBar/> ) Slack Stiffness
                </Button>
            )
    }
}

function Symbol({stage}: { stage: Stage }): JSX.Element {
    switch (stage) {
        case Stage.Growing:
            return <FaSeedling/>
        case Stage.Shaping:
            return <FaSlidersH/>
        case Stage.Slack:
            return <FaYinYang/>
        case Stage.Pretensing:
            return <FaClock/>
        case Stage.Pretenst:
            return <FaHandSpock/>
        default:
            throw new Error("Stage?")
    }
}
