import { Journey } from "../island/journey"
import { Spot } from "../island/spot"

import { IAppState, Mode } from "./app-state"
import { Transition } from "./transition"

export class ClickHandler {

    private trans: Transition

    constructor(state: IAppState) {
        this.trans = new Transition(state)
    }

    public stateAfterClick(spot: Spot): IAppState {

        const trans = this.trans
        const state = trans.state
        const hexalot = spot.centerOfHexalot
        const homeHexalot = state.homeHexalot
        const vacant = state.island.vacantHexalot

        switch (state.mode) {


            case Mode.FixingIsland: // ===========================================================================
                return trans.withSelectedSpot(spot).state


            case Mode.Visiting: // ===============================================================================
                if (state.islandIsLegal && spot.isCandidateHexalot(vacant)) {
                    console.log("with vacant lot")
                    return trans.withVacantHexalotAt(spot).withRestructure.state
                }
                if (hexalot) {
                    console.log("with home hexalot")
                    return trans.withHomeHexalot(hexalot).withSelectedSpot(spot).withRestructure.state
                }
                console.log("with selected lot")
                return trans.withSelectedSpot(spot).state


            case Mode.Landed: // =================================================================================
                if (hexalot) {
                    return trans.withSelectedSpot(spot).state
                }
                return state


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
                    state.storage.setJourneyData(homeHexalot, homeHexalot.journey.data).then(() => {
                        console.log("saved journey")
                    })
                    return trans.withJourney(homeHexalot.journey).state
                }
                return state // todo: no state change?


            case Mode.PreparingDrive: // ==========================================================================
                const target = spot.center
                const adjacent = spot.adjacentSpots.map((s, i) => ({center: s.center, index: i}))
                adjacent.sort((a, b) => target.distanceTo(a.center) - target.distanceTo(b.center))
                console.log("adjacent", adjacent)
                const top = adjacent.pop()
                if (top) {
                    console.log(`Direction: ${top.index}`)
                }
                return state // todo: no state change?


            default: // ================================================================================================
                return state


        }
    }
}

