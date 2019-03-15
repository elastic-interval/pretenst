import {freshGenome} from "../genetics/genome"

import {Hexalot} from "./hexalot"
import {IslandMode, IslandState} from "./island-state"
import {Journey} from "./journey"
import {Spot} from "./spot"

export class IslandStateClick {

    constructor(private state: IslandState) {
    }

    public stateAfterClick(spot: Spot): IslandState {
        const hexalot = spot.centerOfHexalot
        switch (this.state.islandMode) {
            case IslandMode.FixingIsland:
                return this.FixingIsland(spot, hexalot)
            case IslandMode.Visiting:
                return this.Visiting(spot, hexalot)
            case IslandMode.Landed:
                return this.Landed(spot)
            case IslandMode.PlanningJourney:
                const homeHexalot = this.state.homeHexalot
                if (!homeHexalot) {
                    throw new Error("No home hexalot")
                }
                this.state.storage.saveJourney(homeHexalot)
                return this.PlanningJourney(spot, homeHexalot)
            case IslandMode.PlanningDrive:
                return this.PlanningDrive(spot)
            case IslandMode.DrivingFree:
                return this.DrivingFree(spot)
            default:
                throw new Error(`Unknown mode ${this.state.islandMode}`)
        }
    }

    private FixingIsland(spot: Spot, hexalot?: Hexalot): IslandState {
        if (spot.available) {
            return this.state.withNewHexalotAt(spot).withMode(IslandMode.Visiting)
        } else {
            if (hexalot) {
                return this.state.withFreeHexalotsRemoved.withHomeHexalot(hexalot).withRestructure()
            } else {
                return this.state.withSelectedSpot(spot).withRestructure()
            }
        }
    }

    private Visiting(spot: Spot, hexalot?: Hexalot): IslandState {
        if (hexalot) {
            if (!hexalot.occupied) {
                hexalot.genome = freshGenome()
                return this.state.withRestructure()
            } else {
                return this.state.withHomeHexalot(hexalot).withRestructure()
            }
        } else if (spot.available) {
            return this.state.withFreeHexalotsRemoved.withNewHexalotAt(spot)
        } else {
            return this.state
        }
    }

    private Landed(spot: Spot, hexalot?: Hexalot): IslandState {
        if (spot.available) {
            return this.state.withFreeHexalotsRemoved.withNewHexalotAt(spot)
        } else {
            return this.state
        }
    }

    private PlanningJourney(spot: Spot, homeHexalot?: Hexalot): IslandState {
        const hexalot = spot.centerOfHexalot
        if (homeHexalot && hexalot) {
            const journey = homeHexalot.journey
            if (journey) {
                journey.addVisit(hexalot)
            } else {
                homeHexalot.journey = new Journey([homeHexalot, hexalot])
            }
        }
        return this.state // todo: no state change?
    }

    private PlanningDrive(spot: Spot): IslandState {
        const target = spot.center
        const adjacent = spot.adjacentSpots.map((s, i) => ({center: s.center, index: i}))
        adjacent.sort((a, b) => target.distanceTo(a.center) - target.distanceTo(b.center))
        console.log("adjacent", adjacent)
        const top = adjacent.pop()
        if (top) {
            console.log(`Direction: ${top.index}`)
        }
        return this.state // todo: no state change?
    }

    private DrivingFree(spot: Spot): IslandState {
        // todo
        return this.state
    }
}

