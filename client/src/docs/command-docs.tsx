/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CardText } from "reactstrap"

import { Command } from "../state/app-state"

export interface ICommandDoc {
    title: Command,
    body: JSX.Element
}
/*
    Start = "Start",
    Stop = "Stop",
    Terraform = "Terraform",

 */
export const COMMAND_DOCS: ICommandDoc[] = [
    {
        title: Command.AbandonFix,
        body:
            <CardText>
                Abandon fix
            </CardText>,
    },
    {
        title: Command.ClaimHexalot,
        body:
            <CardText>
                Claim hexalot
            </CardText>,
    },
    {
        title: Command.DiscardGenes,
        body:
            <CardText>
                Discard genes
            </CardText>,
    },
    {
        title: Command.Evolve,
        body:
            <CardText>
                Evolve
            </CardText>,
    },
    {
        title: Command.Home,
        body:
            <CardText>
                Home
            </CardText>,
    },
    {
        title: Command.MakeLand,
        body:
            <CardText>
                Make land
            </CardText>,
    },
    {
        title: Command.MakeWater,
        body:
            <CardText>
                Make water
            </CardText>,
    },
    {
        title: Command.Home,
        body:
            <CardText>
                Home
            </CardText>,
    },
    {
        title: Command.Plan,
        body:
            <CardText>
                Plan
            </CardText>,
    },
    {
        title: Command.Ride,
        body:
            <CardText>
                Ride
            </CardText>,
    },
    {
        title: Command.Start,
        body:
            <CardText>
                Start
            </CardText>,
    },
    {
        title: Command.Stop,
        body:
            <CardText>
                Stop
            </CardText>,
    },
    {
        title: Command.Terraform,
        body:
            <CardText>
                Terraform
            </CardText>,
    },
]
