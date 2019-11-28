/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCircle, FaExpandArrowsAlt, FaFutbol, FaVolleyballBall } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IStoredState, transition } from "../storage/stored-state"

export function ToolbarRightTop({storedState$}: {
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {
    const [showPushes, updateShowPushes] = useState(storedState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(storedState$.getValue().showPulls)
    useEffect(() => {
        const subscription = storedState$.subscribe(newState => {
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
                    storedState$.next(transition(storedState$.getValue(), {showPulls: pulls, showPushes: pushes}))
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
