/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Evolution } from "../gotchi/evolution"
import { Jockey } from "../gotchi/jockey"
import { fetchGenome, fetchJourney, Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { calculateHexalotId, isIslandLegal, isSpotLegal, recalculateIsland, Surface } from "../island/island-logic"
import { Journey } from "../island/journey"
import { Spot } from "../island/spot"

import { AppMode, IAppState } from "./app-state"

export class Transition {
    private nextState: IAppState

    constructor(prev: IAppState) {
        this.nextState = {...prev, nonce: prev.nonce + 1}
    }

    public get appState(): IAppState {
        return this.nextState
    }

    public withHelpVisible(helpVisible: boolean): Transition {
        this.nextState = {...this.nextState, helpVisible}
        return this
    }

    public withIsland(island: Island): Transition {
        this.withoutJockey.withoutEvolution.nextState = {...this.nextState, island}
        return this
    }

    public withAppMode(appMode: AppMode): Transition {
        this.nextState = {...this.nextState, appMode}
        return this
    }

    public withJourney(journey?: Journey): Transition {
        this.nextState = {...this.nextState, journey}
        return this
    }

    public async withSelectedHexalot(selectedHexalot?: Hexalot): Promise<Transition> {
        this.nextState = {...this.nextState, selectedHexalot}
        const island = this.nextState.island
        if (selectedHexalot && island) {
            await fetchGenome(selectedHexalot, this.nextState.storage)
            if (selectedHexalot.journey) {
                return this.withJourney(selectedHexalot.journey)
            } else if (island) {
                const journey = await fetchJourney(selectedHexalot, this.nextState.storage, island)
                selectedHexalot.journey = journey
                return this.withJourney(journey)
            }
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
        const island = this.nextState.island
        if (this.nextState.homeHexalot || !island) {
            throw new Error("Not allowed")
        }
        this.nextState = {...this.nextState, homeHexalot}
        if (!homeHexalot) {
            return this.withJourney().withSelectedSpot()
        }
        return this.withSelectedSpot(homeHexalot.centerSpot)
    }

    public get withRestructure(): Transition {
        const island = this.nextState.island
        if (!island) {
            return this
        }
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
            this.nextState = {...this.nextState, islandIsLegal, appMode: AppMode.Terraforming}
        }
        return this
    }

    public async withSurface(surface: Surface): Promise<Transition> {
        const nextState = this.nextState
        const selectedSpot = nextState.selectedSpot
        const island = nextState.island
        if (!island || !selectedSpot) {
            return this
        }
        selectedSpot.surface = surface
        selectedSpot.memberOfHexalot.forEach(calculateHexalotId)
        const nextFree = selectedSpot.adjacentSpots.find(s => s.free && s.surface === Surface.Unknown)
        if (nextFree) {
            return this.withSelectedSpot(nextFree)
        }
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
        this.withoutJockey.nextState = {...this.nextState, jockey, journey: jockey.leg.journey}
        return this
    }

    public withEvolution(homeHexalot: Hexalot): Transition {
        const evolution = new Evolution(homeHexalot, this.appState.jockey)
        this.withoutEvolution.nextState = {...this.nextState, evolution, jockey: undefined}
        return this
    }

    public get withoutJockey(): Transition {
        const jockey = this.nextState.jockey
        if (jockey) {
            jockey.gotchi.recycle()
            this.nextState = {...this.nextState, jockey: undefined}
        }
        return this
    }

    public get withoutEvolution(): Transition {
        const evolution = this.nextState.evolution
        if (evolution) {
            evolution.recycle()
            this.nextState = {...this.nextState, evolution: undefined}
        }
        return this
    }
}
