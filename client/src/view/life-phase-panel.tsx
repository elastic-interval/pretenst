/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaHammer, FaHandSpock, FaSeedling, FaYinYang } from "react-icons/all"
import { Button } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, LifePhase } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

interface IButtonCharacter {
    text: string,
    color: string,
    disabled: boolean,
    symbol: JSX.Element,
    onClick: () => void,
}

export function LifePhasePanel({fabric, fabricState$, rebuild}: {
    fabric: TensegrityFabric,
    fabricState$: BehaviorSubject<IFabricState>,
    rebuild: () => void,
}): JSX.Element {

    const [fabricState, setFabricState] = useState(fabricState$.getValue())
    useEffect(() => {
        const subscription = fabricState$.subscribe(setFabricState)
        return () => subscription.unsubscribe()
    })

    function character(): IButtonCharacter {
        switch (fabricState.lifePhase) {
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
                    onClick: () => fabricState$.next({...fabricState, lifePhase: fabric.slack()}),
                }
            case LifePhase.Slack:
                return {
                    text: "Slack->Pretensing",
                    symbol: <FaYinYang/>,
                    color: "warning",
                    disabled: false,
                    onClick: () => fabricState$.next({...fabricState, lifePhase: fabric.pretensing()}),
                }
            case LifePhase.Pretensing:
                return {
                    text: `Pretensing`,
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
