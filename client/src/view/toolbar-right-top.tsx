/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCircle, FaExpandArrowsAlt, FaFutbol, FaVolleyballBall } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState, transition } from "../fabric/fabric-state"

export function ToolbarRightTop({fabricState$}: {
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {
    const [showPushes, updateShowPushes] = useState(fabricState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(fabricState$.getValue().showPulls)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
        })
        return () => subscription.unsubscribe()
    }, [])

    function ViewButton({pushes, pulls}: { pushes: boolean, pulls: boolean }): JSX.Element {
        return (
            <Button
                style={{color: "white"}}
                color={pushes === showPushes && pulls === showPulls ? "success" : "secondary"}
                onClick={() => {
                    fabricState$.next(transition(fabricState$.getValue(), {showPulls: pulls, showPushes: pushes}))
                }}
            >
                {pushes && pulls ? <FaFutbol/> :
                    pushes ? <FaExpandArrowsAlt/> :
                        pulls ? <FaVolleyballBall/> :
                            <FaCircle/>}
            </Button>
        )
    }

    return (
        <div id="top-right">
            <ButtonGroup>
                <ViewButton pushes={true} pulls={true}/>
                <ViewButton pushes={false} pulls={true}/>
                <ViewButton pushes={true} pulls={false}/>
                <ViewButton pushes={false} pulls={false}/>
            </ButtonGroup>
        </div>
    )
}
