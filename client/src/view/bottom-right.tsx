/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"
import { useEffect, useState } from "react"
import * as React from "react"
import { FaCompressArrowsAlt, FaHandRock, FaParachuteBox, FaSignOutAlt, FaSyncAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { IntervalRole } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { demoModeAtom, rotatingAtom } from "../storage/recoil"

export function BottomRight({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    const [demoMode, setDemoMode] = useRecoilState(demoModeAtom)
    const [rotating, setRotating] = useRecoilState(rotatingAtom)
    return demoMode ? (
        <ButtonGroup>
            <Button
                color="success"
                onClick={() => {
                    setDemoMode(false)
                    setRotating(false)
                }}
            >
                <FaSignOutAlt/> Exit demo
            </Button>
        </ButtonGroup>
    ) : (
        <ButtonGroup>
            {stage < Stage.Slack ? (
                <>
                    <Button
                        disabled={stage !== Stage.Shaping}
                        onClick={() => tensegrity.do(t => t.triangulate((a, b, hasPush) => (
                            !hasPush || a !== IntervalRole.PullA || b !== IntervalRole.PullA
                        )))}>
                        <span>&#9653;</span>
                    </Button>
                    <Button disabled={stage !== Stage.Shaping}
                            onClick={() => tensegrity.fabric.centralize()}>
                        <FaCompressArrowsAlt/>
                    </Button>
                </>
            ) : stage > Stage.Slack ? (
                <>
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(1)}>
                        <FaHandRock/>
                    </Button>
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(10)}>
                        <FaParachuteBox/>
                    </Button>
                </>
            ) : undefined}
            <Button
                color={rotating ? "warning" : "secondary"}
                onClick={() => setRotating(!rotating)}
            >
                <FaSyncAlt/>
            </Button>
        </ButtonGroup>
    )
}
