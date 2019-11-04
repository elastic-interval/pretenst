/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaHammer, FaHandSpock, FaSeedling, FaYinYang } from "react-icons/all"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { LifePhase } from "../fabric/life-phase"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

interface IButtonCharacter {
    text: string,
    color: string,
    disabled: boolean,
    symbol: JSX.Element,
    onClick: () => void,
}

export function LifePhasePanel({fabric, lifePhase$, pretensingStep$, rebuild}: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject<LifePhase>,
    pretensingStep$: BehaviorSubject<number>,
    rebuild: () => void,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    const [pretensingStep, setPretensingStep] = useState(pretensingStep$.getValue())

    useEffect(() => {
        const subscription = pretensingStep$.subscribe(setPretensingStep)
        return () => subscription.unsubscribe()
    })
    useEffect(() => {
        const subscription = lifePhase$.subscribe(setLifePhase)
        return () => subscription.unsubscribe()
    })

    function character(): IButtonCharacter {
        switch (lifePhase) {
            case LifePhase.Growing:
                return {
                    text: "Growing...",
                    symbol: <FaSeedling/>,
                    color: "warning",
                    disabled: true,
                    onClick: () => {
                    },
                }
            case LifePhase.Shaping:
                return {
                    text: "Shaping->Slack",
                    symbol: <FaHammer/>,
                    color: "success",
                    disabled: false,
                    onClick: () => lifePhase$.next(fabric.slack()),
                }
            case LifePhase.Slack:
                return {
                    text: "Slack->Pretensing",
                    symbol: <FaYinYang/>,
                    color: "warning",
                    disabled: false,
                    onClick: () => lifePhase$.next(fabric.pretensing()),
                }
            case LifePhase.Pretensing:
                return {
                    text: `Pretensing ${pretensingStep}%`,
                    symbol: <FaHammer/>,
                    color: "warning",
                    disabled: true,
                    onClick: () => {
                    },
                }
            case LifePhase.Pretenst:
                return {
                    symbol: <FaHandSpock/>,
                    color: "success",
                    text: "Pretenst!",
                    disabled: false,
                    onClick: rebuild,
                }
            default:
                throw new Error()
        }
    }

    const {text, symbol, color, disabled, onClick} = character()
    return (
        <Button className="m-4 w-75" color={color} disabled={disabled} onClick={onClick}>
            {symbol} <span> {text}</span>
        </Button>
    )
}
