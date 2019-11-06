/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaAnchor, FaCamera, FaClock, FaSyncAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { IFabricState } from "../fabric/fabric-state"

export function ToolbarLeft({fabricState$}: {
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {
    const [rotating, updateRotating] = useState(fabricState$.getValue().rotating)
    const [frozen, updateFrozen] = useState(fabricState$.getValue().frozen)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateRotating(newState.rotating)
            updateFrozen(newState.frozen)
        })
        return () => subscription.unsubscribe()
    })
    return (
        <div id="bottom-left">
            <ButtonGroup>
                <Button
                    color={fabricState$.getValue().rotating ? "warning" : "secondary"}
                    onClick={() => {
                        const nonce = fabricState$.getValue().nonce + 1
                        fabricState$.next({...fabricState$.getValue(), nonce, rotating: !rotating})
                    }}
                >
                    {rotating ? <FaAnchor/> : <FaSyncAlt/>}
                </Button>
                <Button
                    color={fabricState$.getValue().frozen ? "warning" : "secondary"}
                    onClick={() => {
                        const nonce = fabricState$.getValue().nonce + 1
                        fabricState$.next({...fabricState$.getValue(), nonce, frozen: !frozen})
                    }}
                >
                    {frozen ? <FaClock/> : <FaCamera/>}
                </Button>
            </ButtonGroup>
        </div>
    )
}
