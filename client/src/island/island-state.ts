import {BehaviorSubject} from "rxjs"
import {Vector3} from "three"

import {AppStorage} from "../app-storage"
import {freshGenome} from "../genetics/genome"
import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"

import {Hexalot} from "./hexalot"
import {Island} from "./island"
import {IslandStateClick} from "./island-state-click"
import {IslandStateCommand} from "./island-state-command"
import {Journey} from "./journey"
import {Spot, Surface} from "./spot"

export enum Command {
    ClaimHexalot = "Claim hexalot",
    ComeHere = "Come here",
    DriveFree = "Drive free",
    DriveJourney = "Drive journey",
    Evolve = "Evolve",
    ForgetJourney = "Forget journey",
    GoThere = "Go there",
    Logout = "Logout",
    MakeLand = "Make into land",
    MakeWater = "Make into water",
    PlanFreeDrive = "Plan free drive",
    PlanJourney = "Plan journey",
    RandomGenome = "Random genome",
    Return = "Return",
    JumpToFix = "Jump to fix",
    AbandonFix = "Abandon fix",
    RotateLeft = "Rotate left",
    RotateRight = "Rotate right",
    SaveGenome = "Save genome",
    StopMoving = "Stop moving",
}

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
        readonly nonce: number,
        readonly island: Island,
        readonly storage: AppStorage,
        public islandMode: IslandMode,
        public islandIsLegal: boolean = false,
        public homeHexalot?: Hexalot,
        public journey?: Journey,
        public selectedSpot?: Spot,
        public selectedHexalot?: Hexalot,
        public gotchi?: Gotchi,
        public evolution?: Evolution,
    ) {
    }

    public stateAfterCommand(command: Command, location: Vector3): IslandState {
        return new IslandStateCommand(this).stateAfterCommand(command, location)
    }

    public stateAfterClick(spot: Spot): IslandState {
        return new IslandStateClick(this).stateAfterClick(spot)
    }

    public get selectedHome(): boolean {
        return !!this.homeHexalot && !!this.selectedHexalot && this.homeHexalot.id === this.selectedHexalot.id
    }

    public get actionHexalotId(): string | undefined {
        if (this.gotchi) {
            return this.gotchi.home.id
        }
        if (this.evolution) {
            return this.evolution.home.id
        }
        return undefined
    }

    public withJourney(journey: Journey): IslandState {
        const copy = this.copy
        copy.journey = journey
        return copy
    }

    public withSelectedSpot(selectedSpot?: Spot): IslandState {
        const copy = this.copy
        copy.selectedSpot = selectedSpot
        copy.selectedHexalot = selectedSpot ? selectedSpot.centerOfHexalot : undefined
        copy.journey = copy.selectedHome && copy.homeHexalot ? this.storage.loadJourney(copy.homeHexalot, this.island) : undefined
        return copy
    }

    public withislandIsLegal(islandIsLegal: boolean): IslandState {
        const copy = this.copy
        copy.islandIsLegal = islandIsLegal
        return copy
    }

    public withMode(islandMode: IslandMode): IslandState {
        const copy = this.copy
        copy.recycle()
        copy.islandMode = islandMode
        return copy
    }

    public get withFreeHexalotsRemoved(): IslandState {
        this.island.removeFreeHexalots()
        return this // todo: no change of state?
    }

    public withHomeHexalot(hexalot?: Hexalot): IslandState {
        const copy = this.copy
        copy.islandMode = hexalot ? IslandMode.Landed : IslandMode.Visiting
        copy.homeHexalot = hexalot
        return copy
    }

    public withNewHexalotAt(spot: Spot): IslandState {
        const copy = this.copy
        const hexalot = this.island.createHexalot(spot)
        if (hexalot) {
            return copy.withSelectedSpot(hexalot.centerSpot)
        }
        return copy
    }

    public get withRestructure(): IslandState {
        const island = this.island
        island.recalculate()
        const hexalots = island.hexalots
        const spots = island.spots
        const singleHexalot = hexalots.length === 1
        const homeHexalot = this.homeHexalot
        spots.forEach(spot => spot.checkFree(singleHexalot))
        hexalots.forEach(hexalot => hexalot.refreshFingerprint())
        const copy = this.withislandIsLegal(island.islandIsLegal)
        if (!copy.islandIsLegal) {
            return copy.withMode(IslandMode.FixingIsland)
        }
        if (singleHexalot) {
            const firstHexalot = hexalots[0]
            const centerSpot = firstHexalot.centerSpot
            return copy.homeHexalot ? copy.withSelectedSpot(centerSpot) : copy
        }
        if (homeHexalot) {
            if (!homeHexalot.occupied) {
                this.storage.setGenome(homeHexalot, freshGenome().genomeData)
            }
            return copy.withSelectedSpot(homeHexalot.centerSpot).withHomeHexalot(homeHexalot)
        }
        return copy.withMode(IslandMode.Visiting)
    }

    public withSurface(surface: Surface): IslandState {
        const selectedSpot = this.selectedSpot
        if (!selectedSpot) {
            return this
        }
        selectedSpot.surface = surface
        const copy = this.copy.withRestructure
        const nextFree = selectedSpot.adjacentSpots.find(s => s.free && s.surface === Surface.Unknown)
        if (nextFree) {
            return copy.withSelectedSpot(nextFree)
        }
        const anyFree = this.island.spots.find(s => s.free && s.surface === Surface.Unknown)
        if (anyFree) {
            return copy.withSelectedSpot(anyFree)
        }
        const unoccupiedHexalot = this.island.hexalots.find(h => !h.occupied)
        if (unoccupiedHexalot) {
            return copy.withSelectedSpot(unoccupiedHexalot.centerSpot)
        }
        return copy
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

    public dispatch(): void {
        const legal = this.islandIsLegal
        const home = !!this.homeHexalot
        const spot = this.selectedSpot ? JSON.stringify(this.selectedSpot.coords) : "-"
        const lot = this.selectedHexalot ? JSON.stringify(this.selectedHexalot.coords) : "-"
        console.log(`${this.nonce}:${this.islandMode}: legal=${legal} home=${home} spot=${spot} lot=${lot}`)
        this.island.state = this
        this.subject.next(this)
    }

    public recycle(): void {
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
            this.nonce + 1,
            this.island,
            this.storage,
            this.islandMode,
            this.islandIsLegal,
            this.homeHexalot,
            this.journey,
            this.selectedSpot,
            this.selectedHexalot,
            this.gotchi,
            this.evolution,
        )
        ditto.subject = this.subject
        return ditto
    }
}
