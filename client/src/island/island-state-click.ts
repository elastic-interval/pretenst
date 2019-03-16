import {IslandMode, IslandState} from "./island-state"
import {Journey} from "./journey"
import {Spot} from "./spot"

export class IslandStateClick {

    constructor(private state: IslandState) {
    }

    public stateAfterClick(spot: Spot): IslandState {

        console.log(`Hexalots=${this.state.island.hexalots.length} Spots=${this.state.island.spots.length}`)

        const hexalot = spot.centerOfHexalot

        switch (this.state.islandMode) {


            case IslandMode.FixingIsland: // ===========================================================================
                return this.state.withSelectedSpot(spot)


            case IslandMode.Visiting: // ===============================================================================
                if (spot.canBeClaimed && this.state.islandIsLegal) {
                    return this.state.withFreeHexalotsRemoved.withNewHexalotAt(spot).withRestructure
                }
                return this.state.withSelectedSpot(spot)


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

