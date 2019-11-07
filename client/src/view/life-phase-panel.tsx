/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaClock, FaHammer, FaHandSpock, FaSeedling, FaYinYang } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { LifePhase } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function LifePhasePanel({fabric, lifePhase$}: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject <LifePhase>,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
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
                return <h1><FaYinYang/> Pretensing <FaYinYang/></h1>
            case LifePhase.Pretenst:
                return <h1><FaHandSpock/> Pretenst <FaHandSpock/></h1>
            case LifePhase.Busy:
                return <h1><FaClock/> Pretenst <FaHandSpock/></h1>
        }
    }

    return (
        <div className="my-4 w-100">
            <div className="text-center">
                <LifePhaseIcon/>
            </div>
            <ButtonGroup vertical={true} className="w-100">
                <Button
                    disabled={lifePhase !== LifePhase.Shaping}
                    onClick={() => fabric.toMature()}
                >
                    <span>Prepare to <FaYinYang/> pretense</span>
                </Button>
                <Button
                    disabled={lifePhase !== LifePhase.Pretenst}
                    onClick={() => fabric.toMature(1)}
                >
                    <span>Pretense <FaHandSpock/> 3 times</span>
                </Button>
                <Button
                    disabled={lifePhase !== LifePhase.Pretenst}
                    onClick={() => fabric.toMature(10)}
                >
                    <span>Pretense <FaHandSpock/><FaHandSpock/> 10 times</span>
                </Button>
                <Button
                    disabled={lifePhase !== LifePhase.Pretenst}
                    onClick={() => fabric.toMature(100)}
                >
                    <span>Pretense <FaHandSpock/><FaHandSpock/><FaHandSpock/> 100 times</span>
                </Button>
            </ButtonGroup>
        </div>
    )
}
