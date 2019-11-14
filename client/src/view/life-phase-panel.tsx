/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowRight,
    FaClock,
    FaHammer,
    FaHandSpock,
    FaLeaf,
    FaSeedling,
    FaYinYang,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { LifePhase } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function LifePhasePanel({fabric, lifePhase$, rebuild, disabled}: {
    fabric: TensegrityFabric,
    lifePhase$: BehaviorSubject<LifePhase>,
    rebuild: () => void,
    disabled: boolean,
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(lifePhase$.getValue())
    useEffect(() => {
        const subscription = lifePhase$.subscribe(newPhase => setLifePhase(newPhase))
        return () => subscription.unsubscribe()
    }, [])

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
                <Button disabled={disabled} onClick={rebuild}>
                    <span>Regrow <FaLeaf/> <FaArrowRight/> Shaping <FaHammer/></span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Shaping || disabled} onClick={() => fabric.toSlack()}>
                    <span>Shaping <FaHammer/> <FaArrowRight/> Slack <FaYinYang/></span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Slack || disabled} onClick={() => fabric.fromSlackToPretensing()}>
                    <span>Slack <FaYinYang/> <FaArrowRight/> Pretenst <FaHandSpock/> Gravity <FaArrowDown/></span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Pretenst || disabled} onClick={() => fabric.fromStrainsToStiffnesses()}>
                    <span>Pretenst <FaHandSpock/> Strain <FaArrowRight/> Slack <FaYinYang/> Stiffness</span>
                </Button>
                <Button disabled={lifePhase !== LifePhase.Pretenst || disabled} onClick={() => fabric.toSlack()}>
                    <span>Pretenst <FaHandSpock/> <FaArrowRight/> Slack <FaYinYang/></span>
                </Button>
            </ButtonGroup>
        </div>
    )
}
