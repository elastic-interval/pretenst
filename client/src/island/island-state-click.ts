import {IslandMode, IslandState} from "./island-state"
import {Journey} from "./journey"
import {Spot} from "./spot"

export class IslandStateClick {

    constructor(private state: IslandState) {
    }

    public stateAfterClick(spot: Spot): IslandState {

        const state = this.state
        const hexalot = spot.centerOfHexalot
        const homeHexalot = state.homeHexalot
        const vacant = state.island.vacantHexalot

        switch (state.islandMode) {


            case IslandMode.FixingIsland: // ===========================================================================
                return state.withSelectedSpot(spot)


            case IslandMode.Visiting: // ===============================================================================
                if (state.islandIsLegal && spot.isVacantLandWithOccupiedAdjacentLand(vacant)) {
                    console.log("with vacant lot")
                    return state.withVacantHexalotAt(spot).withRestructure
                }
                if (hexalot) {
                    console.log("with home hexalot")
                    return state.withHomeHexalot(hexalot).withSelectedSpot(spot).withRestructure
                }
                console.log("with selected lot")
                return state.withSelectedSpot(spot)


            case IslandMode.Landed: // =================================================================================
                if (hexalot) {
                    return state.withSelectedSpot(spot)
                }
                return state


            case IslandMode.PlanningJourney: // ========================================================================
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
                    return state.withJourney(homeHexalot.journey)
                }
                return state // todo: no state change?


            case IslandMode.PreparingDrive: // ==========================================================================
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

