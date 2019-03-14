import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"

import {Hexalot} from "./hexalot"
import {Journey} from "./journey"
import {Spot, Surface} from "./spot"

export enum IslandMode {
    DrivingFree = "Driving free",
    DrivingJourney = "Driving journey",
    Evolving = "Evolving",
    FixingIsland = "Fixing island",
    Landed = "Landed",
    PlanningDrive = "Planning drive",
    PlanningJourney = "Planning journey",
    Visiting = "Visiting",
}

export class IslandState {
    constructor(
        public islandMode: IslandMode,
        public homeHexalot?: Hexalot,
        public selectedSpot?: Spot,
        public selectedHexalot?: Hexalot,
        public selectedSurface?: Surface,
        public gotchi?: Gotchi,
        public evolution?: Evolution,
        public journey?: Journey,
    ) {
    }

    public withMode(islandMode: IslandMode): IslandState {
        const copy = this.copy
        copy.islandMode = islandMode
        switch (islandMode) {
            case IslandMode.FixingIsland:
                break
            case IslandMode.Visiting:
                break
            case IslandMode.Landed:
                break
            case IslandMode.PlanningJourney:
                break
            case IslandMode.PlanningDrive:
                break
            case IslandMode.Evolving:
                break
            case IslandMode.DrivingFree:
                break
            case IslandMode.DrivingJourney:
                break
        }
        return copy
    }

    public withSelectedSpot(selectedSpot?: Spot): IslandState {
        const copy = this.copy
        copy.selectedSpot = selectedSpot
        copy.selectedHexalot = selectedSpot ? selectedSpot.centerOfHexalot : undefined
        copy.selectedSurface = selectedSpot ? selectedSpot.surface : undefined
        return copy
    }

    public withSurface(surface: Surface): IslandState {
        if (this.selectedSpot) {
            this.selectedSpot.surface = surface
            const copy = this.copy
            copy.selectedSurface = surface
            return copy
        } else {
            return this
        }
    }

    public withGotchi(gotchi: Gotchi, journey?: Journey): IslandState {
        this.recycle()
        const copy = this.copy
        copy.gotchi = gotchi
        copy.islandMode = journey ? IslandMode.DrivingJourney : IslandMode.DrivingFree
        copy.journey = journey
        return copy
    }

    public withEvolution(evolution: Evolution): IslandState {
        this.recycle()
        const copy = this.copy
        copy.evolution = evolution
        copy.islandMode = IslandMode.Evolving
        return copy
    }

    public withHomeHexalot(hexalot?: Hexalot): IslandState {
        const copy = this.copy
        copy.homeHexalot = hexalot
        copy.islandMode = hexalot ? IslandMode.Landed : IslandMode.Visiting
        return copy
    }

    public get homeSelected(): Hexalot | undefined {
        if (!this.selectedHexalot || !this.homeHexalot) {
            return undefined
        }
        return this.selectedHexalot.id === this.homeHexalot.id ? this.homeHexalot : undefined
    }

    // =============================================================

    private recycle(): void {
        if (this.gotchi) {
            this.gotchi.recycle()
        }
        if (this.evolution) {
            this.evolution.recycle()
        }
    }

    private get copy(): IslandState {
        return new IslandState(
            this.islandMode,
            this.homeHexalot,
            this.selectedSpot,
            this.selectedHexalot,
            this.selectedSurface,
            this.gotchi,
            this.evolution,
            this.journey,
        )
    }
}
