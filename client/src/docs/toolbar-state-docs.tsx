/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CardText } from "reactstrap"

export enum ToolbarState {
    AvailableSpot = "Available spot",
    Planning = "Planning",
    Evolving = "Evolving",
    Fixing = "Fixing",
    Foreign = "Foreign",
    FreeSpot = "Free spot",
    Home = "Home",
    Pioneering = "Pioneering",
    Riding = "Riding",
    Unknown = "Unknown",
}

export interface IToolbarStateDoc {
    title: ToolbarState
    body: JSX.Element
}

export const TOOLBAR_STATE_DOCS: IToolbarStateDoc[] = [
    {
        title: ToolbarState.AvailableSpot,
        body:
            <CardText>
                AvailableSpot
            </CardText>,
    },
    {
        title: ToolbarState.Planning,
        body:
            <CardText>
                Planning
            </CardText>,
    },
    {
        title: ToolbarState.Evolving,
        body:
            <CardText>
                Evolving
            </CardText>,
    },
    {
        title: ToolbarState.Fixing,
        body:
            <CardText>
                Fixing
            </CardText>,
    },
    {
        title: ToolbarState.Foreign,
        body:
            <CardText>
                Foreign
            </CardText>,
    },
    {
        title: ToolbarState.FreeSpot,
        body:
            <CardText>
                FreeSpot
            </CardText>,
    },
    {
        title: ToolbarState.Home,
        body:
            <CardText>
                Home
            </CardText>,
    },
    {
        title: ToolbarState.Pioneering,
        body:
            <CardText>
                Pioneering
            </CardText>,
    },
    {
        title: ToolbarState.Riding,
        body:
            <CardText>
                Riding
            </CardText>,
    },
    {
        title: ToolbarState.Unknown,
        body:
            <CardText>
                Unknown
            </CardText>,
    },
]
