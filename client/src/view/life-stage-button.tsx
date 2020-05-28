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
    CaptureLengthsToSlack,
    SlackToPretensing,
    SlackToShaping,
    CapturePretenstToSlack,
    CaptureStrainForStiffness,
}

export function LifeStageButton({tensegrity, stageTransition, disabled}: {
    tensegrity: Tensegrity,
    stageTransition: StageTransition,
    disabled: boolean,
}): JSX.Element {

    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

    function allDisabledExcept(stageAccepted: Stage): boolean {
        if (disabled || life.stage === Stage.Pretensing) {
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
                    onClick={() => tensegrity.transition = {stage: Stage.Slack, adoptLengths: true}}
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
                    onClick={() => tensegrity.transition = {stage: Stage.Pretensing}}
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
                        onClick={() => tensegrity.transition = {stage: Stage.Shaping}}
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
                    onClick={() => tensegrity.transition = {stage: Stage.Slack, adoptLengths: true}}
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
                    onClick={() => tensegrity.transition = {stage: Stage.Slack, strainToStiffness: true}}
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
