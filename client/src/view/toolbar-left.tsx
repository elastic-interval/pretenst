/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaAnchor, FaCamera, FaClock, FaSyncAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { IFabricState } from "../fabric/fabric-state"

export function ToolbarLeft({fabricState, setFabricState}: {
    fabricState: IFabricState,
    setFabricState: (fabricState: IFabricState) => void,
}): JSX.Element {
    return (
        <div id="bottom-left">
            <ButtonGroup>
                <Button
                    color={fabricState.rotating ? "warning" : "secondary"}
                    onClick={() => setFabricState({...fabricState, rotating: !fabricState.rotating})}
                >
                    {fabricState.rotating ? <FaAnchor/> : <FaSyncAlt/>}
                </Button>
                <Button
                    color={fabricState.frozen ? "warning" : "secondary"}
                    onClick={() => setFabricState({...fabricState, frozen: !fabricState.frozen})}
                >
                    {fabricState.frozen ? <FaClock/> : <FaCamera/>}
                </Button>
            </ButtonGroup>
        </div>
    )
}
