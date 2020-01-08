/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"

import { Page, Para, Special, Title, VideoLoop } from "./doc-parts"

export function Intro(): JSX.Element {
    return (
        <Page>
            <Title>Pretenst Design</Title>
            <Special>
                Pretenst software is a 4D design tool for physical structures which
                can be built from elements of pure compression (bars) and tension (cables)
                and exploring how these structures behave over time and under stress.
            </Special>
            <Para>
                Most houses that we think of are made of stacking solid bricks on top of one another,
                maybe with something in between to stick them together. A bridge or a really tall building
                must go a bit further, so to understand we need to think about where all the forces come
                from and where they go.
            </Para>
            <Para>
                Civil engineers don't just use concrete, because they know that concrete on its own will
                just crumble and fall apart. As we've all seen when we peek through the fence at a building site,
                the first thing they do is lay down a lattice of steel rods, and only later do they pour the
                concrete. It's only the combination of the concrete and the pre-tensed steel
                rods that actually makes it last. Pre-tension is everywhere! It's just mostly hidden.
            </Para>
            <Para>
                Pretenst design makes the pushing and pulling forces visual and explicit, and it invites
                us to see what can be built when we distill spatial structure down to its fundamentals.
            </Para>
            <VideoLoop name="zero-pretenst" caption="The Zero Shape" width={250}/>
        </Page>
    )
}
