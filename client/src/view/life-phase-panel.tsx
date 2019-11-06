/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaClock, FaHammer, FaHandSpock, FaSeedling, FaYinYang } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, LifePhase } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function LifePhasePanel({fabric, fabricState$, rebuild}: {
    fabric: TensegrityFabric,
    fabricState$: BehaviorSubject<IFabricState>,
    rebuild: () => void,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(fabric.lifePhase)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            setLifePhase(newState.lifePhase)
        })
        return () => subscription.unsubscribe()
    })

    function LifePhaseIcon(): JSX.Element {
        switch (lifePhase) {
            case LifePhase.Growing:
                return <h1><FaSeedling/> Growing <FaSeedling/></h1>
            case LifePhase.Shaping:
                return <h1><FaHammer/> Shaping <FaHammer/></h1>
            case LifePhase.Slack:
                return <h1><FaYinYang/> Slack <FaYinYang/></h1>
            case LifePhase.Pretensing:
                return <h1><FaClock/> Pretensing <FaClock/></h1>
            case LifePhase.Pretenst:
                return <h1><FaHandSpock/> Pretenst <FaHandSpock/></h1>
        }
    }

    return (
        <div className="my-4 w-100">
            <div className="text-center">
                <LifePhaseIcon/>
            </div>
            <ButtonGroup vertical={true} className="w-100">
                <Button
                    disabled={lifePhase !== LifePhase.Shaping && lifePhase !== LifePhase.Pretenst}
                    onClick={() => fabricState$.next({...fabricState$.getValue(), lifePhase: fabric.slack()})}
                >
                    <span>Enter <FaYinYang/> Slack</span>
                </Button>
                <Button
                    disabled={lifePhase !== LifePhase.Slack}
                    onClick={() => fabricState$.next({...fabricState$.getValue(), lifePhase: fabric.pretensing()})}
                >
                    <span>Start <FaHandSpock/> Pretensing</span>
                </Button>
                <Button
                    disabled={lifePhase !== LifePhase.Pretenst}
                    onClick={rebuild}
                >
                    <span>Grow <FaSeedling/> Again</span>
                </Button>
            </ButtonGroup>
        </div>
    )
}
