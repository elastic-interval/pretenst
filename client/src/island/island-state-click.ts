import {freshGenome} from "../genetics/genome"

import {IslandMode, IslandState} from "./island-state"
import {Journey} from "./journey"
import {Spot} from "./spot"

export class IslandStateClick {

    constructor(private state: IslandState) {
    }

    public stateAfterClick(spot: Spot): IslandState {

        const hexalot = spot.centerOfHexalot

        switch (this.state.islandMode) {


            case IslandMode.FixingIsland: // ===========================================================================
                if (spot.canBeClaimed) {
                    return this.state.withSelectedSpot(spot).withRestructure
                } else {
                    if (hexalot) {
                        return this.state.withFreeHexalotsRemoved.withHomeHexalot(hexalot).withRestructure
                    } else {
                        return this.state.withSelectedSpot(spot).withRestructure
                    }
                }


            case IslandMode.Visiting: // ===============================================================================
                if (hexalot) {
                    if (!hexalot.occupied) {
                        hexalot.genome = freshGenome()
                        return this.state.withRestructure
                    } else {
                        return this.state.withHomeHexalot(hexalot).withRestructure
                    }
                }
                if (spot.canBeClaimed) {
                    return this.state.withFreeHexalotsRemoved.withNewHexalotAt(spot).withRestructure
                }
                return this.state


            case IslandMode.Landed: // =================================================================================
                return this.state


            case IslandMode.PlanningJourney: // ========================================================================
                const homeHexalot = this.state.homeHexalot
                if (!homeHexalot) {
                    throw new Error("No home hexalot")
                }
                this.state.storage.saveJourney(homeHexalot)
                if (homeHexalot && hexalot) {
                    const journey = homeHexalot.journey
                    if (journey) {
                        journey.addVisit(hexalot)
                    } else {
                        homeHexalot.journey = new Journey([homeHexalot, hexalot])
                    }
                }
                return this.state // todo: no state change?


            case IslandMode.PlanningDrive: // ==========================================================================
                const target = spot.center
                const adjacent = spot.adjacentSpots.map((s, i) => ({center: s.center, index: i}))
                adjacent.sort((a, b) => target.distanceTo(a.center) - target.distanceTo(b.center))
                console.log("adjacent", adjacent)
                const top = adjacent.pop()
                if (top) {
                    console.log(`Direction: ${top.index}`)
                }
                return this.state // todo: no state change?


            case IslandMode.DrivingFree: // ============================================================================
                // todo
                return this.state


            default: // ================================================================================================
                throw new Error(`Unknown mode ${this.state.islandMode}`)


        }
    }
}

