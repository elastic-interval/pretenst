/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Journey } from "../island/journey"
import { Spot } from "../island/spot"

import { IslandState, Mode } from "./island-state"
import { Transition } from "./transition"

export class ClickHandler {

    private trans: Transition

    constructor(islandState: IslandState, private userId?: string) {
        this.trans = new Transition(islandState)
    }

    public async stateAfterClick(spot: Spot): Promise<IslandState> {

        const trans = this.trans
        const islandState = trans.islandState
        const hexalot = spot.centerOfHexalot
        const homeHexalot = islandState.homeHexalot
        const island = islandState.island
        const vacant = island.vacantHexalot

        switch (islandState.mode) {


            case Mode.FixingIsland: // ===========================================================================
                return (await trans.withSelectedSpot(spot)).islandState


            case Mode.Visiting: // ===============================================================================
                if (this.userId && !homeHexalot && islandState.islandIsLegal && spot.isCandidateHexalot(vacant)) {
                    island.vacantHexalot = island.createHexalot(spot)
                    return (await trans.withSelectedSpot(spot)).withMode(Mode.FixingIsland).withRestructure.islandState
                }
                return (await trans.withSelectedSpot(spot)).islandState


            case Mode.Landed: // =================================================================================
                if (spot) {
                    return (await trans.withSelectedSpot(spot)).islandState
                }
                return islandState


            case Mode.PlanningJourney: // ========================================================================
                if (!homeHexalot) {
                    throw new Error("No home hexalot")
                }
                if (hexalot) {
                    if (homeHexalot.journey) {
                        homeHexalot.journey.addVisit(hexalot)
                    } else {
                        homeHexalot.journey = new Journey([homeHexalot, hexalot])
                    }
                    islandState.storage.setJourneyData(homeHexalot, homeHexalot.journey.data).then(() => {
                        console.log("saved journey")
                    })
                    return trans.withJourney(homeHexalot.journey).islandState
                }
                return islandState


            case Mode.PreparingRide: // ==========================================================================
                const target = spot.center
                const adjacent = spot.adjacentSpots.map((s, i) => ({center: s.center, index: i}))
                adjacent.sort((a, b) => target.distanceTo(a.center) - target.distanceTo(b.center))
                console.log("adjacent", adjacent)
                const top = adjacent.pop()
                if (top) {
                    console.log(`Direction: ${top.index}`)
                }
                return islandState // todo: no state change?


            default: // ================================================================================================
                return islandState


        }
    }
}

