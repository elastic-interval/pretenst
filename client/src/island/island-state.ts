import {Subject} from "rxjs"
import {Vector3} from "three"

import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"
import {IStorage} from "../storage/storage"

import {Hexalot} from "./hexalot"
import {Island} from "./island"
import {IslandStateClick} from "./island-state-click"
import {IslandStateCommand} from "./island-state-command"
import {Journey} from "./journey"
import {Spot, Surface} from "./spot"

export enum Command {
    AbandonFix = "Abandon fix",
    ClaimHexalot = "Claim hexalot",
    ComeHere = "Come here",
    DriveFree = "Drive free",
    DriveJourney = "Drive journey",
    Evolve = "Evolve",
    ForgetJourney = "Forget journey",
    GoThere = "Go there",
    JumpToFix = "Jump to fix",
    Logout = "Logout",
    MakeLand = "Make into land",
    MakeWater = "Make into water",
    PlanJourney = "Plan journey",
    PrepareDrive = "Prepare drive",
    RandomGenome = "Random genome",
    Return = "Return",
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
    PlanningJourney = "Planning journey",
    PreparingDrive = "Preparing drive",
    Visiting = "Visiting",
}

export class IslandState {
    constructor(
        readonly nonce: number,
        readonly island: Island,
        readonly storage: IStorage,
        readonly subject: Subject<IslandState>,
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

    public withJourney(journey?: Journey): IslandState {
        const copy = this.copy
        copy.journey = journey
        return copy
    }

    public withSelectedSpot(selectedSpot?: Spot): IslandState {
        const copy = this.copy
        copy.selectedSpot = selectedSpot
        if (selectedSpot) {
            const hexalot = copy.selectedHexalot = selectedSpot.centerOfHexalot
            if (hexalot) {
                const genomePresent = hexalot.fetchGenome(this.storage, () => {
                    this.island.state.dispatch()
                })
                console.log(`Genome present for ${hexalot.id}`, genomePresent)
            }
        } else {
            copy.selectedHexalot = undefined
        }
        return copy
    }

    public withIslandIsLegal(islandIsLegal: boolean): IslandState {
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

    public withHomeHexalot(hexalot?: Hexalot): IslandState {
        const copy = this.copy
        copy.homeHexalot = hexalot
        if (hexalot) {
            copy.islandMode = IslandMode.Landed
            const home = copy.homeHexalot
            if (this.selectedHome && home) {
                const journeyPresent = home.fetchJourney(this.storage, this.island, () => {
                    this.island.state.withJourney(home.journey).dispatch()
                })
                console.log(`Journey present for ${home.id}`, journeyPresent)
                copy.journey = home.journey
            }
        } else {
            copy.islandMode = IslandMode.Visiting
            copy.journey = undefined
        }
        return copy
    }

    public withVacantHexalotAt(spot: Spot): IslandState {
        const copy = this.copy
        const vacant = this.island.createHexalot(spot)
        this.island.vacantHexalot = vacant
        return copy.withSelectedSpot(vacant.centerSpot)
    }

    public get withRestructure(): IslandState {
        const island = this.island
        island.recalculate()
        const hexalots = island.hexalots
        const spots = island.spots
        const homeHexalot = this.homeHexalot
        const vacant = island.vacantHexalot
        if (hexalots.length === 1) {
            spots.forEach(spot => spot.free = true)
        } else if (vacant) {
            spots.forEach(spot => spot.free = spot.memberOfHexalot.every(hexalot => hexalot.id === vacant.id))
        } else {
            spots.forEach(spot => spot.free = false)
        }
        hexalots.forEach(hexalot => hexalot.refreshId())
        const copy = this.withIslandIsLegal(island.islandIsLegal)
        if (!copy.islandIsLegal) {
            return copy.withMode(IslandMode.FixingIsland)
        }
        if (homeHexalot) {
            return copy.withHomeHexalot(homeHexalot)
        }
        return copy.withMode(IslandMode.Visiting)
    }

    public withSurface(surface: Surface): IslandState {
        const selectedSpot = this.selectedSpot
        if (!selectedSpot) {
            return this
        }
        selectedSpot.surface = surface
        selectedSpot.memberOfHexalot.forEach(hexalot => hexalot.refreshId())
        const copy = this.copy
        const nextFree = selectedSpot.adjacentSpots.find(s => s.free && s.surface === Surface.Unknown)
        if (nextFree) {
            return copy.withSelectedSpot(nextFree).withRestructure
        }
        const anyFree = this.island.spots.find(s => s.free && s.surface === Surface.Unknown)
        if (anyFree) {
            return copy.withSelectedSpot(anyFree).withRestructure
        }
        const vacantHexalot = this.island.vacantHexalot
        if (vacantHexalot) {
            return copy.withSelectedSpot(vacantHexalot.centerSpot).withRestructure
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
        return new IslandState(
            this.nonce + 1,
            this.island,
            this.storage,
            this.subject,
            this.islandMode,
            this.islandIsLegal,
            this.homeHexalot,
            this.journey,
            this.selectedSpot,
            this.selectedHexalot,
            this.gotchi,
            this.evolution,
        )
    }
}
