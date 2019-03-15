import {BehaviorSubject} from "rxjs"

import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"

import {Hexalot} from "./hexalot"
import {Island} from "./island"
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
    public subject: BehaviorSubject<IslandState>

    constructor(
        readonly island: Island,
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
                copy.recycle()
                break
            case IslandMode.Visiting:
                copy.recycle()
                break
            case IslandMode.Landed:
                copy.recycle()
                break
            case IslandMode.PlanningJourney:
                copy.recycle()
                break
            case IslandMode.PlanningDrive:
                copy.recycle()
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

    public withNewHexalotAt(spot: Spot): IslandState {
        const copy = this.copy
        this.island.createHexalot(spot)
        return copy.withSelectedSpot(spot).withRefreshedStructure()
    }

    public withRefreshedStructure(): IslandState {
        return this.island.stateAfterRefresh(this)
    }

    public withSelectedSpot(selectedSpot?: Spot): IslandState {
        const copy = this.copy
        copy.selectedSpot = selectedSpot
        copy.selectedHexalot = selectedSpot ? selectedSpot.centerOfHexalot : undefined
        copy.selectedSurface = selectedSpot ? selectedSpot.surface : undefined
        return copy
    }

    public withSurface(surface: Surface): IslandState {
        const selectedSpot = this.selectedSpot
        if (selectedSpot) {
            selectedSpot.surface = surface
            const copy = this.copy
            copy.selectedSurface = surface
            const nextFree = selectedSpot.adjacentSpots.find(s => s.free && s.surface === Surface.Unknown)
            if (nextFree) {
                return copy.withSelectedSpot(nextFree)
            } else {
                return copy
            }
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

    public get withFreeHexalotsRemoved(): IslandState {
        this.island.removeFreeHexalots()
        return this // todo: no change of state?
    }

    public withHomeHexalot(hexalot?: Hexalot): IslandState {
        const copy = this.copy.withSelectedSpot(hexalot ? hexalot.centerSpot : undefined)
        copy.homeHexalot = hexalot
        copy.islandMode = copy.homeHexalot ? IslandMode.Landed : IslandMode.Visiting
        return copy
    }

    public get homeSelected(): Hexalot | undefined {
        if (!this.selectedHexalot || !this.homeHexalot) {
            return undefined
        }
        return this.selectedHexalot.id === this.homeHexalot.id ? this.homeHexalot : undefined
    }

    public dispatch(): void {
        this.island.state = this
        this.subject.next(this)
    }

    // =============================================================

    private recycle(): void {
        if (this.gotchi) {
            this.gotchi.recycle()
            this.gotchi = undefined
        }
        if (this.evolution) {
            this.evolution.recycle()
            this.evolution = undefined
        }
    }

    private get copy(): IslandState {
        const ditto = new IslandState(
            this.island,
            this.islandMode,
            this.homeHexalot,
            this.selectedSpot,
            this.selectedHexalot,
            this.selectedSurface,
            this.gotchi,
            this.evolution,
            this.journey,
        )
        ditto.subject = this.subject
        return ditto
    }
}
