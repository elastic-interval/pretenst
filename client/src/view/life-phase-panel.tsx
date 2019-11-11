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
    lifePhase$: BehaviorSubject<LifePhase>,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
        return () => subscription.unsubscribe()
    })

    function LifePhaseIcon(): JSX.Element {
        switch (lifePhase) {
            case LifePhase.Growing:
                return <h2><FaSeedling/> Growing <FaSeedling/></h2>
            case LifePhase.Shaping:
                return <h2><FaHammer/> Shaping <FaHammer/></h2>
            case LifePhase.Slack:
                return <h2><FaYinYang/> Slack <FaYinYang/></h2>
            case LifePhase.Pretensing:
                return <h2><FaYinYang/> Pretensing <FaYinYang/></h2>
            case LifePhase.Pretenst:
                return <h2><FaHandSpock/> Pretenst <FaHandSpock/></h2>
            case LifePhase.Busy:
                return <h2><FaClock/> Pretenst <FaHandSpock/></h2>
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
                    onClick={() => fabric.toMature(true)}
                >
                    <span>Slack and <FaYinYang/> Pretense</span>
                </Button>
                <Button
                    disabled={lifePhase !== LifePhase.Pretenst}
                    onClick={() => fabric.toMature(false)}
                >
                    <span>Pretense <FaHandSpock/> again</span>
                </Button>
            </ButtonGroup>
        </div>
    )
}
