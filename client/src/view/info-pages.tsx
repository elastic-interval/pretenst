import * as React from 'react'
import {Col, Container, Row} from 'reactstrap'

const GALAPAGOTCHI = 'https://github.com/geralddejong/galapagotchi'
const FLUXE = 'https://twitter.com/fluxe'
const WEBASSEMBLY = 'https://webassembly.org/'
const WEBGL = 'https://en.wikipedia.org/wiki/WebGL'
const THREEJS = 'https://threejs.org/'
const DARWINS_DANGEROUS_IDEA = 'https://en.wikipedia.org/wiki/Darwin%27s_Dangerous_Idea'
const THE_BLIND_WATCHMAKER = 'https://en.wikipedia.org/wiki/The_Blind_Watchmaker'
const AGE_OF_THE_EARTH = 'https://en.wikipedia.org/wiki/Age_of_the_Earth'
const CHARLES_DARWIN = 'https://en.wikipedia.org/wiki/Charles_Darwin'
const RICHARD_DAWKINS = 'https://en.wikipedia.org/wiki/Richard_Dawkins'

export const INFO_PAGES: JSX.Element[] = [
    (
        <div>
            <p>
                This is the first <strong>Galapagotch Island</strong>.
            </p>
            <p>
                What you see is a toy world, but it's also a place
                where you can get a sense of how natural selection works.
            </p>
            <p>
                It's developing into a game, so
                welcome because both players and developers can help make it more fun!
            </p>
        </div>
    )
    ,
    (
        <div>
            <p>
                You can zoom and move around with your mouse,
                and you can click on something to focus on it.
            </p>
            <p>
                When you focus on something it stays in the center,
                and you can zoom and twirl around it.
            </p>
            <p>
                If you are not already a resident of the island,
                you will see green spots where you can decide to live.
            </p>
        </div>
    )
    ,
    (
        <div>
            <p>
                As the story goes, <strong>galapa</strong> means something like
                "family" in the local dialect and a <strong>hexalot</strong>,
                is a unique beehive pattern of surface spots where a *gotchi* lives.
            </p>
            <p>
                Every *hexalot* is a place with a completely unique pattern
                and it is forever connected to its neighbors.
            </p>
        </div>
    )
    ,
    (
        <div>
            <p>
                A <strong>galapagotchi</strong> emerges from its hexalot,
                evolving first body shape and then muscle coordination.
            </p>
            <p>
                The genes of a galapagotchi are not DNA like ours, but are instead frozen sequences of dice.
            </p>
            <p className="dice">
                ⚁⚂⚃⚂⚀⚄⚅⚂⚂⚅⚂⚃⚁⚁⚄⚀⚅⚄⚅...
            </p>
        </div>
    )
    ,
    (

        <div>
            <p>
                A mutated gene is a near-perfect copy, but with some dice randomly tossed.
                The result of tossing a few dice <a href={THE_BLIND_WATCHMAKER}>is anybody's guess</a>.
            </p>
            <p>
                A gotchi evolves in an accelerated kind of "multiverse" where they compete with
                mutated versions of themselves in the same space.
                While evolving, they look a bit like ghosts.
            </p>
        </div>
    )
    ,
    (

        <div>
            <p>
                To acquire a shape, the galapagotchi are completely dependent on their master, the player.
            </p>
            <p>
                This is an aesthetic selection phase, so the master can throw the dice
                until a good enough body appears.
            </p>
        </div>
    )
    ,
    (

        <div>
            <p>
                To acquire running behavior, a *gotchi* continues its multiverse evolution
                with a drive to run and a sense of direction (<i>intelligent design</i>: guilty as charged,
                don't want to wait <a href={AGE_OF_THE_EARTH}>billions of years</a>).
            </p>
        </div>
    )
    ,
    (
        <div>
            <p>
                A *gotchi* competes against mutations of itself, like toy bacteria might,
                but *wow* it can evolve to run with conviction!
            </p>
            <p>
                As the <a href={RICHARD_DAWKINS}>Dawkins</a>-inspired evolution proceeds,
                the slowest are forgotten while the fastest become pregnant
                and give birth to mutations of themselves, tossing a few dice.
            </p>
        </div>
    )
    , (
        <div>
            <p>
                Surviving galapagotchi are the ones who froze the right dice, according to
                the natural rules discovered
                by <a href={CHARLES_DARWIN}>Charles Darwin</a> and
                elaborated by Dawkins and others since.',
            </p>
            <p>
                Their genes come from a long line of frozen dice patterns that were
                almost exactly as successful at making their bodies run.
            </p>
        </div>
    )
    ,
    (
        <div>
            <strong>hexalot</strong>:
            universally unique beehive pattern of 127 surface spots;
            home of a <i>galapagotchi</i>
        </div>
    )
    ,
    (
        <div>
            <strong>gotchi</strong>:
            avatar;
            an evolving body with the singular purpose of running; representative of a player;
            short for <i>galapagotchi</i>.
        </div>
    )
    ,
    (
        <div>
            <strong>galapa</strong>:
            permanently interwoven;
            inextricably connected;
            family
        </div>
    )
    ,
    (
        <div>
            <strong>galapagotchisland</strong>:
            one of six possible siblings living in neighbor <i>hexalots</i>
        </div>
    )
    ,
    (
        <div>
            <p>
                <a target="_blank" href={GALAPAGOTCHI}>Look here</a> or <a href={FLUXE}>find me</a> if
                you are interested in <a href={WEBASSEMBLY}>WebAssembly</a>, <a href={THREEJS}>ThreeJS</a>/<a
                href={WEBGL}>WebGL</a>,
                or <a href={DARWINS_DANGEROUS_IDEA}>Darwin's Evolution</a>.
            </p>
            <Container>
                <Row>
                    <Col>
                        <img src="wa.png"/>
                    </Col>
                    <Col>
                        <img src="cd.jpg"/>
                    </Col>
                </Row>
            </Container>
        </div>
    ),
]
