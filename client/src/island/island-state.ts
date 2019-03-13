import {Hexalot} from "./hexalot"
import {Spot, Surface} from "./spot"

export enum IslandMode {
    FixingIsland = "Fixing island",
    Visiting = "Visiting",
    Landed = "Landed",
    PlanningJourney = "Planning journey",
    PlanningDrive = "Planning drive",
    Evolving = "Evolving",
    DrivingFree = "Driving free",
    DrivingJourney = "Driving journey",
}

export class IslandState {
    constructor(
        readonly islandMode: IslandMode,
        readonly selectedSpot?: Spot,
        readonly selectedHexalot?: Hexalot,
        readonly selectedSurface?: Surface,
    ) {
    }

    public setIslandMode(islandMode: IslandMode): IslandState {
        return new IslandState(islandMode, this.selectedSpot, this.selectedHexalot)
    }

    public setSelectedSpot(selectedSpot?: Spot): IslandState {
        const selectedHexalot = selectedSpot ? selectedSpot.centerOfHexalot : undefined
        const selectedSurface = selectedSpot ? selectedSpot.surface : undefined
        return new IslandState(this.islandMode, selectedSpot, selectedHexalot, selectedSurface)
    }

    public setSurface(surface: Surface): IslandState {
        if (this.selectedSpot) {
            this.selectedSpot.surface = surface
        }
        return new IslandState(this.islandMode, this.selectedSpot, this.selectedHexalot, surface)
    }
}
