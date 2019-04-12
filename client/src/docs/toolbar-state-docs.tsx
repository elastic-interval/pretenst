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
                This spot is one that you could claim if you wanted.
            </CardText>,
    },
    {
        title: ToolbarState.Planning,
        body:
            <CardText>
                You are planning your journey.  This journey is where you galapagotchi rides when you let it go,
                and it is the path that
            </CardText>,
    },
    {
        title: ToolbarState.Evolving,
        body:
            <CardText>
                Your gotchi is experiencing a kind of multiverse evolution.
                It has been placed in competition with a number of mutations of itself, and they are
                now locked in a fight for survival.
            </CardText>,
    },
    {
        title: ToolbarState.Fixing,
        body:
            <CardText>
                You have reserved a new hexalot, but this has created a bit of virgin territory at the edge
                of the island which you still have to terraform.
            </CardText>,
    },
    {
        title: ToolbarState.Foreign,
        body:
            <CardText>
                You have selected somebody else's galapagotchi.  You can take it for a ride to see how well
                it can run.
            </CardText>,
    },
    {
        title: ToolbarState.FreeSpot,
        body:
            <CardText>
                A free spot is a hexagonal spot which can be terraformed, which means that you can turn it
                into land or water.
            </CardText>,
    },
    {
        title: ToolbarState.Home,
        body:
            <CardText>
                You have selected your home hexalot, and from here you can plan your journey.
                If you already have a journey planned you can try and ride it, or you can start the evolution
                process so that your gotchi learns how to move around.
            </CardText>,
    },
    {
        title: ToolbarState.Pioneering,
        body:
            <CardText>
                You are a pioneer, so we can assume that you need no instructions.
            </CardText>,
    },
    {
        title: ToolbarState.Riding,
        body:
            <CardText>
                You are riding on a gotchi, which means that you tag along close behind as the gotchi
                runs each of the legs of its journey.
            </CardText>,
    },
    {
        title: ToolbarState.Unknown,
        body:
            <CardText>
                Unknown state?
            </CardText>,
    },
]
