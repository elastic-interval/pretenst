/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CardBody, CardText } from "reactstrap"

const THE_BLIND_WATCHMAKER = "https://en.wikipedia.org/wiki/The_Blind_Watchmaker"
const CHARLES_DARWIN = "https://en.wikipedia.org/wiki/Charles_Darwin"
const RICHARD_DAWKINS = "https://en.wikipedia.org/wiki/Richard_Dawkins"
const GITHUB = "https://github.com/beautiful-code-bv/galapagotchi"
const GITTER = "https://gitter.im/galapagotchis/community"
const WEBASSEMBLY = "https://webassembly.org/"
const WEBGL = "https://en.wikipedia.org/wiki/WebGL"
const THREEJS = "https://threejs.org/"
const DARWINS_DANGEROUS_IDEA = "https://en.wikipedia.org/wiki/Darwin%27s_Dangerous_Idea"
const GMAIL = "galapagotchi@gmail.com"
const TWITTER = "https://twitter.com/galapagotchi"

export enum GlobalDocTitle {
    Darwin = "Darwin",
    Developers = "Developers",
    Evolution = "Evolution",
    Genes = "Genes",
    Hexalot = "Hexalot",
    Island = "Island",
    Mutation = "Mutation",
    Navigation = "Navigation",
    Release = "What stage is it at?",
    Twitter = "Twitter",
    Why = "What is this about?",
}

export interface IGlobalDoc {
    title: GlobalDocTitle
    body: JSX.Element
}

interface IRef {
    href: string
    text: string
}

function Ref(props: IRef): JSX.Element {
    return <span> <a href={props.href} target="_blank">{props.text}</a> </span>
}

export function getGlobalDoc(globalDocTitle: GlobalDocTitle): IGlobalDoc {
    const foundCard = GLOBAL_DOCS.find(doc => doc.title === globalDocTitle)
    if (!foundCard) {
        throw new Error(`Couldn't find doc for ${globalDocTitle}`)
    }
    return foundCard
}

const GLOBAL_DOCS: IGlobalDoc[] = [
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
    {
        title: GlobalDocTitle.Why,
        body:
            <CardBody>
                <CardText>
                    This project aims to give you a fascinating experience that shows you
                    how things can evolve by Darwin's natural selection.
                    You are taken to an imaginary island where you can see inside of a toy world,
                    with toy physics, and you can evolve little robots to run.
                </CardText>
            </CardBody>,
    },
    {
        title: GlobalDocTitle.Release,
        body:
            <CardBody>
                This is a very early alpha release of the Galapagotchi universe,
                but if you want to join in, create your own evolving Galapagotchi and start evolving,
                contact us and we will send you a key.
            </CardBody>,
    },
    {
        title: GlobalDocTitle.Island,
        body:
            <CardBody>
                <CardText>
                    You can visit the island and claim your new hexalot
                    but remember, every new hexalot creates a little bit more virgin territory.
                </CardText>
                <CardText>
                    It's your job to terraform the new part of the island before you can claim a home there.
                    Terraforming is done with hexagonal spots of land and water.
                    It has to follow certain rules:
                </CardText>
                <CardText>
                    There always has to be a land path to the edge of the island,
                    and land spot needs to touch two land spots.
                    Also, neither water nor land can be surrounded by its own kind.
                    That's all.
                </CardText>
            </CardBody>,
    },
    {
        title: GlobalDocTitle.Developers,
        body:
            <CardBody>
                <CardText>
                    <p>
                        You've come to the right place if you are interested in
                        <br/>
                        <br/>
                        <Ref href={WEBASSEMBLY} text="WebAssembly"/>
                        <br/>
                        <Ref href={THREEJS} text="ThreeJS"/>
                        <br/>
                        <Ref href={WEBGL} text="WebGL"/>
                        <br/>
                        <Ref href={DARWINS_DANGEROUS_IDEA} text="Darwin's Evolution"/>
                    </p>
                    <p>
                        Join

                        <Ref href={GITTER} text="the gitter community"/>

                        or explore

                        <Ref href={GITHUB} text="the github project"/>.
                    </p>

                </CardText>
            </CardBody>,
    },
    {
        title: GlobalDocTitle.Twitter,
        body:
            <CardBody>
                <CardText>
                    Follow the project on Twitter <Ref href={TWITTER} text="@galapagotchi"/> or
                    contact us at <strong>{GMAIL}</strong>.
                </CardText>
            </CardBody>,
    },
]
