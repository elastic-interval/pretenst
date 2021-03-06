/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, SurfaceCharacter } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaAnchor,
    FaArrowRight,
    FaCamera,
    FaChartBar,
    FaClock,
    FaFutbol,
    FaHandSpock,
    FaSeedling,
    FaSlidersH,
    FaTape,
    FaYinYang,
} from "react-icons/all"
import { Button } from "reactstrap"

import { Tensegrity } from "../fabric/tensegrity"

export enum StageTransition {
    CaptureLengthsToSlack,
    SlackToPretensingFrozen,
    SlackToPretensingSticky,
    SlackToPretensingBouncy,
    CapturePretenstToSlack,
    CaptureStrainForStiffness,
}

export const STAGE_TRANSITIONS = Object.keys(StageTransition)
    .filter(k => isNaN(parseInt(k, 10)))
    .map(k => StageTransition[k])

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
        case StageTransition.CaptureLengthsToSlack:
            return (
                <Button
                    disabled={allDisabledExcept(Stage.Shaping)}
                    onClick={() => tensegrity.do(t => t.stage = Stage.Slack)}
                >
                    <FaCamera/><FaArrowRight/><Symbol stage={Stage.Slack}/>
                </Button>
            )
        case StageTransition.SlackToPretensingFrozen:
            return (
                <Button
                    disabled={allDisabledExcept(Stage.Slack)}
                    onClick={() => tensegrity.do(t => {
                        t.instance.world.set_surface_character(SurfaceCharacter.Frozen)
                        t.stage = Stage.Pretensing
                    })}
                >
                    <Symbol stage={Stage.Slack}/><FaArrowRight/><FaAnchor/><Symbol stage={Stage.Pretenst}/>
                </Button>
            )
        case StageTransition.SlackToPretensingSticky:
            return (
                <Button
                    disabled={allDisabledExcept(Stage.Slack)}
                    onClick={() => tensegrity.do(t => {
                        t.instance.world.set_surface_character(SurfaceCharacter.Sticky)
                        t.stage = Stage.Pretensing
                    })}
                >
                    <Symbol stage={Stage.Slack}/><FaArrowRight/><FaTape/><Symbol stage={Stage.Pretenst}/>
                </Button>
            )
        case StageTransition.SlackToPretensingBouncy:
            return (
                <Button
                    disabled={allDisabledExcept(Stage.Slack)}
                    onClick={() => tensegrity.do(t => {
                        t.instance.world.set_surface_character(SurfaceCharacter.Bouncy)
                        t.stage = Stage.Pretensing
                    })}
                >
                    <Symbol stage={Stage.Slack}/><FaArrowRight/><FaFutbol/><Symbol stage={Stage.Pretenst}/>
                </Button>
            )
        case StageTransition.CapturePretenstToSlack:
            return (
                <Button
                    disabled={allDisabledExcept(Stage.Pretenst)}
                    onClick={() => tensegrity.do(t => t.stage = Stage.Slack)}
                >
                    <Symbol stage={Stage.Pretenst}/><FaArrowRight/><Symbol stage={Stage.Slack}/>
                </Button>
            )
        case StageTransition.CaptureStrainForStiffness:
            return (
                <Button
                    disabled={allDisabledExcept(Stage.Pretenst)}
                    onClick={() => tensegrity.do(t => {
                        t.stage = Stage.Slack
                        t.strainToStiffness()
                    })}
                >
                    <Symbol stage={Stage.Pretenst}/><FaArrowRight/><Symbol stage={Stage.Slack}/><FaChartBar/>
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
