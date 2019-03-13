import {Hexalot} from "./hexalot"
import {Spot, Surface} from "./spot"

export enum IslandMode {
    FixingIsland = "Fixing island",
    Visiting = "Visiting",
    PlanningJourney = "Planning journey",
    PlanningDrive = "Planning drive",
    Evolving = "Evolving",
    DrivingFree = "Driving free",
    DrivingJourney = "Driving journey",
}

export class IslandState {
    constructor(
        readonly islandMode: IslandMode,
        readonly homeHexalot?: Hexalot,
        readonly selectedSpot?: Spot,
        readonly selectedHexalot?: Hexalot,
        readonly selectedSurface?: Surface,
    ) {
    }

    public setIslandMode(islandMode: IslandMode): IslandState {
        return new IslandState(islandMode, this.homeHexalot, this.selectedSpot, this.selectedHexalot, this.selectedSurface)
    }

    public setSelectedSpot(selectedSpot?: Spot): IslandState {
        const selectedHexalot = selectedSpot ? selectedSpot.centerOfHexalot : undefined
        const selectedSurface = selectedSpot ? selectedSpot.surface : undefined
        return new IslandState(this.islandMode, this.homeHexalot, selectedSpot, selectedHexalot, selectedSurface)
    }

    public setSurface(surface: Surface): IslandState {
        if (this.selectedSpot) {
            this.selectedSpot.surface = surface
        }
        return new IslandState(this.islandMode, this.homeHexalot, this.selectedSpot, this.selectedHexalot, surface)
    }

    public setHomeToSelected(): IslandState {
        return new IslandState(this.islandMode, this.selectedHexalot, this.selectedSpot, this.selectedHexalot, this.selectedSurface)
    }

    public get selectedHome(): Hexalot | undefined {
        if (this.selectedHexalot && this.homeHexalot && this.selectedHexalot.id === this.homeHexalot.id) {
            return this.selectedHexalot
        } else {
            return undefined
        }
    }
}
