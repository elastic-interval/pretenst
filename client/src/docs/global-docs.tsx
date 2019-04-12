/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CardBody, CardText } from "reactstrap"

const THE_BLIND_WATCHMAKER = "https://en.wikipedia.org/wiki/The_Blind_Watchmaker"
const CHARLES_DARWIN = "https://en.wikipedia.org/wiki/Charles_Darwin"
const RICHARD_DAWKINS = "https://en.wikipedia.org/wiki/Richard_Dawkins"

export enum GlobalDocTitle {
    Navigation = "Navigation",
    Hexalot = "Hexalot",
    Genes = "Genes",
    Evolution = "Evolution",
    Mutation = "Mutation",
    Darwin = "Darwin",
}

export interface IGlobalDoc {
    title: GlobalDocTitle
    body: JSX.Element
}

export const GLOBAL_DOCS: IGlobalDoc[] = [
    {
        title: GlobalDocTitle.Navigation,
        body:
            <CardBody>
                <CardText>
                    You can zoom and move around with your mouse,
                    and you can click on something to focus on it.
                </CardText>
                <CardText>
                    When you focus on something it stays in the center,
                    and you can zoom and twirl around it.
                </CardText>
                <CardText>
                    If you are not already a resident of the island,
                    you will see green spots where you can decide to live.
                </CardText>
            </CardBody>,
    }
    ,
    {
        title: GlobalDocTitle.Hexalot,
        body:
            <CardBody>
                <CardText>
                    A "hexalot" is a region of the island shaped like a honeycomb,
                    with 127 spots which are either land or water.
                </CardText>
                <CardText>
                    There are no two patterns alike,
                    and since hexalots overlap each one is forever connected to its neighbors.
                </CardText>
                <CardText>
                    A "gotchi" is a virtual animal which is born and reborn from an egg at the middle of a hexalot.
                </CardText>
            </CardBody>,
    }
    ,
    {
        title: GlobalDocTitle.Genes,
        body:
            <CardBody>
                <CardText>
                    The genes of a gotchi are not DNA like ours, but are instead sequences of dice rolls.
                </CardText>
                <CardText>
                    Our DNA is coded with four molecules called "Adenine (A), Thymine (T), Cytosine (C), Guanine (G)",
                    so using the 4 letter alphabet of ATCG. Gotchi genes are coded as dice with 123456.
                </CardText>
                <CardText className="dice">
                    ⚁ ⚂ ⚃ ⚂ ⚀ ⚄ ⚅ ⚂ ⚂ ⚅ ⚂ ⚃ ⚁ ⚁ ⚄ ⚀ ⚅ ⚄ ⚅ ...
                </CardText>
            </CardBody>,
    }
    ,
    {
        title: GlobalDocTitle.Evolution,
        body:
            <CardBody>
                <CardText>
                    A mutated gene is a near-perfect copy, but with some dice randomly tossed.
                    The result of tossing a few dice <a href={THE_BLIND_WATCHMAKER}>is anybody's guess</a>.
                </CardText>
                <CardText>
                    A gotchi evolves in an accelerated kind of "multiverse" where they compete with
                    mutated versions of themselves in the same space.
                    While evolving, they look a bit like ghosts.
                </CardText>
            </CardBody>,
    }
    ,
    {
        title: GlobalDocTitle.Mutation,
        body:
            <CardBody>
                <CardText>
                    A gotchi competes against mutations of itself, like toy bacteria might,
                    but wow it can evolve to run with conviction!
                </CardText>
                <CardText>
                    As the <a href={RICHARD_DAWKINS}>Dawkins</a>-inspired evolution proceeds,
                    the slowest are forgotten while the fastest become pregnant
                    and give birth to mutations of themselves, tossing a few dice.
                </CardText>
            </CardBody>,
    }
    ,
    {
        title: GlobalDocTitle.Darwin,
        body:
            <CardBody>
                <CardText>
                    Surviving galapagotchi are the ones who froze the right dice, according to
                    the natural rules discovered
                    by <a href={CHARLES_DARWIN}>Charles Darwin</a> and
                    elaborated by Dawkins and others since.
                </CardText>
                <CardText>
                    Their genes come from a long line of frozen dice patterns that were
                    almost exactly as successful at making their bodies run.
                </CardText>
            </CardBody>,
    }
    ,
]
