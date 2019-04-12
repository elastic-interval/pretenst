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

export const COMMAND_DOCS: ICommandDoc[] = [
    {
        title: Command.AbandonTerraforming,
        body:
            <CardText>
                While you are terraforming the island by terraforming (creating land or water),
                you can decide to abandon the choice you made and start again.
            </CardText>,
    },
    {
        title: Command.ClaimHexalot,
        body:
            <CardText>
                When you have reserved a hexalot, and terraformed the island to make sure it follows
                the rules, you can claim the hexalot you reserved.
                It then belongs to you, since it is completely unique and nobody else can claim the same one.
            </CardText>,
    },
    {
        title: Command.DiscardGenes,
        body:
            <CardText>
                If you don't like what you're seeing during the evolution and you've given up hope for
                this particular gotchi, you can discard the current set of genes and start from scratch.
            </CardText>,
    },
    {
        title: Command.Evolve,
        body:
            <CardText>
                Evolving creates a group of competing galapagotchis which exist in the same space
                at the same time, but have slightly mutated genes.
                They go through cycles, like generations.
                Every time the slowest are forgotten and the new generation is made by mutating the genes
                of the current survivors.
            </CardText>,
    },
    {
        title: Command.Home,
        body:
            <CardText>
                Wherever you are, you can go back to your home position up in the tower.
            </CardText>,
    },
    {
        title: Command.MakeLand,
        body:
            <CardText>
                While terraforming, you can choose to make the current hexagonal spot into land.
            </CardText>,
    },
    {
        title: Command.MakeWater,
        body:
            <CardText>
                While terraforming, you can choose to make the current hexagonal spot into water.
            </CardText>,
    },
    {
        title: Command.Plan,
        body:
            <CardText>
                When you plan your journey, you zoom out and see the world from above.
                Clicking on a new neighbor hexalot adds a leg to your journey,
                and clicking on one that is already in the journey makes it end there.
            </CardText>,
    },
    {
        title: Command.Ride,
        body:
            <CardText>
                You can ride a gotchi, which means that it will be born from the center tower of its
                home hexalot and try to follow the arrows of its journey, visiting hexalots along the way.
            </CardText>,
    },
    {
        title: Command.Start,
        body:
            <CardText>
                If you have stopped a gotchi during a ride, you can tell it to start up again.
            </CardText>,
    },
    {
        title: Command.Stop,
        body:
            <CardText>
                If you are tagging along behind a running gotchi, you can tell it to stop.
            </CardText>,
    },
    {
        title: Command.Terraform,
        body:
            <CardText>
                After choosing an unoccupied hexalot, new spots appear at the edge of the island.
                you can terraform these spots to choose whether they'll be land or water. The terraform button takes you to
                any problems that still remain on the island.
            </CardText>,
    },
]
