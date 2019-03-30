/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Evolution } from "../gotchi/evolution"
import { Gotchi } from "../gotchi/gotchi"
import { Jockey } from "../gotchi/jockey"
import { fetchGenome, fetchJourney, Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { calculateHexalotId, isIslandLegal, isSpotLegal, recalculateIsland, Surface } from "../island/island-logic"
import { Journey } from "../island/journey"
import { Spot } from "../island/spot"

import { IslandState, Mode } from "./island-state"

export class Transition {
    private nextState: IslandState

    constructor(prev: IslandState) {
        this.nextState = {...prev, nonce: prev.nonce + 1}
    }

    public get islandState(): IslandState {
        return this.nextState
    }

    public withIsland(island: Island): Transition {
        this.recycle()
        this.nextState = {...this.nextState, island}
        return this
    }

    public withMode(mode: Mode): Transition {
        this.recycle()
        this.nextState = {...this.nextState, mode}
        return this
    }

    public withJourney(journey?: Journey): Transition {
        this.nextState = {...this.nextState, journey}
        return this
    }

    public async withSelectedHexalot(selectedHexalot?: Hexalot): Promise<Transition> {
        this.nextState = {...this.nextState, selectedHexalot}
        if (selectedHexalot) {
            await fetchGenome(selectedHexalot, this.nextState.storage)
            return this
        }
        return this
    }

    public async withSelectedSpot(selectedSpot?: Spot): Promise<Transition> {
        this.nextState = {...this.nextState, selectedSpot}
        if (selectedSpot) {
            return this.withSelectedHexalot(selectedSpot.centerOfHexalot)
        }
        return this.withSelectedHexalot()
    }

    public withIslandIsLegal(islandIsLegal: boolean): Transition {
        this.nextState = {...this.nextState, islandIsLegal}
        return this
    }

    public async withHomeHexalot(homeHexalot?: Hexalot): Promise<Transition> {
        if (this.nextState.homeHexalot) {
            throw new Error("Not allowed")
        }
        this.nextState = {...this.nextState, homeHexalot}
        if (!homeHexalot) {
            return this.withMode(Mode.Visiting).withJourney().withSelectedSpot()
        }
        fetchJourney(homeHexalot, this.nextState.storage, this.nextState.island)
        return (await this.withSelectedSpot(homeHexalot.centerSpot)).withJourney(homeHexalot.journey).withMode(Mode.Landed)
    }

    public get withRestructure(): Transition {
        const island = this.nextState.island
        recalculateIsland(island)
        const hexalots = island.hexalots
        const spots = island.spots
        const vacant = island.vacantHexalot
        if (hexalots.length === 1) {
            spots.forEach(spot => spot.free = true)
        } else if (vacant) {
            spots.forEach(spot => spot.free = spot.memberOfHexalot.every(hexalot => hexalot.id === vacant.id))
        } else {
            spots.forEach(spot => spot.free = false)
        }
        hexalots.forEach(calculateHexalotId)
        const islandIsLegal = isIslandLegal(island)
        if (islandIsLegal) {
            this.nextState = {...this.nextState, islandIsLegal}
        } else {
            this.nextState = {...this.nextState, islandIsLegal, mode: Mode.FixingIsland}
        }
        return this
    }

    public async withSurface(surface: Surface): Promise<Transition> {
        const islandState = this.nextState
        const selectedSpot = islandState.selectedSpot
        if (!selectedSpot) {
            return this
        }
        selectedSpot.surface = surface
        selectedSpot.memberOfHexalot.forEach(calculateHexalotId)
        const nextFree = selectedSpot.adjacentSpots.find(s => s.free && s.surface === Surface.Unknown)
        if (nextFree) {
            return this.withSelectedSpot(nextFree)
        }
        const island = islandState.island
        const anyFree = island.spots.find(s => s.free && s.surface === Surface.Unknown)
        if (anyFree) {
            return this.withSelectedSpot(anyFree)
        }
        const illegal = island.spots.find(s => !isSpotLegal(s))
        if (illegal) {
            return this.withSelectedSpot(illegal)
        }
        const vacantHexalot = island.vacantHexalot
        if (vacantHexalot) {
            return this.withSelectedSpot(vacantHexalot.centerSpot)
        }
        return this
    }

    public withJockey(jockey: Jockey): Transition {
        this.recycle()
        const mode = Mode.RidingJourney
        this.nextState = {...this.nextState, jockey, journey: jockey.leg.journey, mode}
        return this
    }

    public withGotchi(gotchi: Gotchi): Transition {
        this.recycle()
        const mode = Mode.RidingFree
        this.nextState = {...this.nextState, gotchi, mode}
        return this
    }

    public withEvolution(evolution: Evolution): Transition {
        this.recycle()
        this.nextState = {...this.nextState, evolution, mode: Mode.Evolving}
        return this
    }

    private recycle(): void {
        const jockey = this.nextState.jockey
        if (jockey) {
            jockey.gotchi.recycle()
            this.nextState = {...this.nextState, jockey: undefined}
        }
        const gotchi = this.nextState.gotchi
        if (gotchi) {
            gotchi.recycle()
            this.nextState = {...this.nextState, gotchi: undefined}
        }
        const evolution = this.nextState.evolution
        if (evolution) {
            evolution.recycle()
            this.nextState = {...this.nextState, evolution: undefined}
        }
    }
}
