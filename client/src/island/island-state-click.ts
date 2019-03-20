import {IslandMode, IslandState} from "./island-state"
import {Journey} from "./journey"
import {Spot} from "./spot"

export class IslandStateClick {

    constructor(private state: IslandState) {
    }

    public stateAfterClick(spot: Spot): IslandState {

        const hexalot = spot.centerOfHexalot
        const homeHexalot = this.state.homeHexalot

        switch (this.state.islandMode) {


            case IslandMode.FixingIsland: // ===========================================================================
                return this.state.withSelectedSpot(spot)


            case IslandMode.Visiting: // ===============================================================================
                if (spot.canBeClaimed && this.state.islandIsLegal) {
                    return this.state.withFreeHexalotsRemoved.withNewHexalotAt(spot).withRestructure
                }
                if (hexalot) {
                    return this.state.withHomeHexalot(hexalot).withSelectedSpot(spot).withRestructure
                }
                return this.state.withSelectedSpot(spot)


            case IslandMode.Landed: // =================================================================================
                if (hexalot) {
                    return this.state.withSelectedSpot(spot)
                }
                return this.state


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
                    this.state.storage.saveJourney(homeHexalot).then(() => {
                        console.log("saved journey")
                    })
                    return this.state.withJourney(homeHexalot.journey)
                }
                return this.state // todo: no state change?


            case IslandMode.PreparingDrive: // ==========================================================================
                const target = spot.center
                const adjacent = spot.adjacentSpots.map((s, i) => ({center: s.center, index: i}))
                adjacent.sort((a, b) => target.distanceTo(a.center) - target.distanceTo(b.center))
                console.log("adjacent", adjacent)
                const top = adjacent.pop()
                if (top) {
                    console.log(`Direction: ${top.index}`)
                }
                return this.state // todo: no state change?


            default: // ================================================================================================
                return this.state


        }
    }
}

