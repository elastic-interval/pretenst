import {BehaviorSubject} from "rxjs"

import {AppStorage} from "../app-storage"
import {Direction} from "../body/fabric-exports"
import {freshGenome, IGenomeData} from "../genetics/genome"
import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"

import {Hexalot} from "./hexalot"
import {Island} from "./island"
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
    ReturnHome = "Return home",
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
        readonly island: Island,
        readonly storage: AppStorage,
        public islandMode: IslandMode,
        public legal: boolean = false,
        public homeHexalot?: Hexalot,
        public selectedSpot?: Spot,
        public selectedHexalot?: Hexalot,
        public gotchi?: Gotchi,
        public evolution?: Evolution,
        public journey?: Journey,
    ) {
    }

    public clickSpot(spot: Spot): void {
        const homeHexalot = this.homeHexalot
        const hexalot = spot.centerOfHexalot
        switch (this.islandMode) {
            case IslandMode.FixingIsland:
                if (spot.available) {
                    this.withNewHexalotAt(spot).withMode(IslandMode.Visiting).dispatch()
                } else {
                    if (hexalot) {
                        this.withFreeHexalotsRemoved.withHomeHexalot(hexalot).withRestructure().dispatch()
                    } else {
                        this.withSelectedSpot(spot).withRestructure().dispatch()
                    }
                }
                break
            case IslandMode.Visiting:
                if (hexalot) {
                    if (!hexalot.occupied) {
                        hexalot.genome = freshGenome()
                        this.withRestructure().dispatch()
                    } else {
                        this.withHomeHexalot(hexalot).withRestructure().dispatch()
                    }
                } else if (spot.available) {
                    this.withFreeHexalotsRemoved.withNewHexalotAt(spot).dispatch()
                }
                break
            case IslandMode.Landed:
                if (spot.available) {
                    this.withFreeHexalotsRemoved.withNewHexalotAt(spot).dispatch()
                }
                break
            case IslandMode.PlanningJourney:
                console.log("Planning gets spot", homeHexalot, hexalot)
                if (homeHexalot && hexalot) {
                    const journey = homeHexalot.journey
                    if (journey) {
                        journey.addVisit(hexalot)
                    } else {
                        homeHexalot.journey = new Journey([homeHexalot, hexalot])
                    }
                    this.storage.saveJourney(homeHexalot)
                    // todo: make the journey update?
                }
                break
            case IslandMode.PlanningDrive:
                const target = spot.center
                const adjacent = spot.adjacentSpots.map((s, i) => ({center: s.center, index: i}))
                adjacent.sort((a, b) => target.distanceTo(a.center) - target.distanceTo(b.center))
                console.log("adjacent", adjacent)
                const top = adjacent.pop()
                if (top) {
                    console.log(`Direction: ${top.index}`)
                }
                break
            case IslandMode.DrivingFree:
                // todo: drive to the spot
                break
        }
    }

    public executeCommand(command: Command): void {
        const homeHexalot = this.homeHexalot
        const gotchi = this.gotchi
        const journey = this.journey
        const selectedSpot = this.selectedSpot
        switch (command) {
            case Command.Logout:
                this.withHomeHexalot().withRestructure().dispatch()
                break
            case Command.SaveGenome:
                if (homeHexalot && gotchi) {
                    console.log("Saving")
                    const genomeData = gotchi.genomeData
                    this.storage.setGenome(homeHexalot, genomeData)
                }
                break
            case Command.RandomGenome:
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                break
            case Command.ReturnHome:
                if (homeHexalot) {
                    this.withSelectedSpot(homeHexalot.centerSpot).withMode(IslandMode.Landed).dispatch()
                }
                break
            case Command.PlanFreeDrive:
                this.withMode(IslandMode.PlanningDrive).dispatch()
                break
            case Command.DriveFree:
                if (homeHexalot) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        this.withGotchi(newbornGotchi).dispatch()
                    }
                }
                break
            case Command.DriveJourney:
                if (homeHexalot) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        this.withGotchi(newbornGotchi, journey).dispatch()
                    }
                }
                break
            case Command.Evolve:
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (genomeData: IGenomeData) => this.storage.setGenome(homeHexalot, genomeData)
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        this.withEvolution(evolution).dispatch()
                    }
                }
                break
            case Command.ForgetJourney:
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    // this.props.storage.saveJourney(homeHexalot)
                }
                break
            case Command.RotateLeft:
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    this.withSelectedSpot(homeHexalot.centerSpot).dispatch() // todo: rotation
                }
                break
            case Command.RotateRight:
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    this.withSelectedSpot(homeHexalot.centerSpot).dispatch() // todo: rotation
                }
                break
            case Command.ComeHere:
                // if (gotchi) {
                //     gotchi.approach(this.perspectiveCamera.position, true)
                // }
                break
            case Command.GoThere:
                // if (gotchi) {
                //     gotchi.approach(this.perspectiveCamera.position, false)
                // }
                break
            case Command.StopMoving:
                if (gotchi) {
                    gotchi.nextDirection = Direction.REST
                }
                break
            case Command.MakeLand:
                if (selectedSpot && selectedSpot.free) {
                    this.withSurface(Surface.Land).withRestructure().dispatch()
                }
                break
            case Command.MakeWater:
                if (selectedSpot && selectedSpot.free) {
                    this.withSurface(Surface.Water).withRestructure().dispatch()
                }
                break
            case Command.JumpToFix:
                const unknownSpot = this.island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    this.withSelectedSpot(unknownSpot).dispatch()
                }
                break
            case Command.AbandonFix:
                this.withFreeHexalotsRemoved.dispatch()
                break
            case Command.ClaimHexalot:
                if (!homeHexalot && selectedSpot && selectedSpot.available) {
                    const withNewHexalot = this.withNewHexalotAt(selectedSpot)
                    const hexalot = withNewHexalot.selectedHexalot
                    if (hexalot) {
                        this.storage.setGenome(hexalot, freshGenome().genomeData)
                    }
                    withNewHexalot.island.save()
                    withNewHexalot.withRestructure().dispatch()
                }
                break
            case Command.PlanJourney:
                this.withMode(IslandMode.PlanningJourney).dispatch()
                break
            default:
                throw new Error("Unknown command!")
        }
    }

    // =============================================================

    private withMode(islandMode: IslandMode): IslandState {
        const copy = this.copy
        copy.islandMode = islandMode
        switch (islandMode) {
            case IslandMode.FixingIsland:
            case IslandMode.Visiting:
            case IslandMode.Landed:
            case IslandMode.PlanningJourney:
            case IslandMode.PlanningDrive:
                copy.recycle()
                break
        }
        return copy
    }

    private withLegal(legal: boolean): IslandState {
        const copy = this.copy
        copy.legal = legal
        return copy
    }

    private withNewHexalotAt(spot: Spot): IslandState {
        const copy = this.copy
        this.island.createHexalot(spot)
        return copy.withSelectedSpot(spot).withRestructure()
    }

    private withRestructure(): IslandState {
        const island = this.island
        const legal = this.island.refreshStructureLegal()
        const hexalots = island.hexalots
        const spots = island.spots
        const singleHexalot = hexalots.length === 1
        const homeHexalot = this.homeHexalot
        if (homeHexalot) {
            spots.forEach(spot => spot.available = false)
        } else {
            spots.forEach(spot => spot.checkAvailable(singleHexalot, legal))
        }
        spots.forEach(spot => spot.checkFree(singleHexalot))
        hexalots.forEach(hexalot => hexalot.refreshFingerprint())
        const copy = this.withLegal(legal)
        if (!legal) {
            return copy.withMode(IslandMode.FixingIsland)
        }
        if (singleHexalot) {
            const firstHexalot = hexalots[0]
            const centerSpot = firstHexalot.centerSpot
            if (!firstHexalot.occupied) {
                centerSpot.available = legal
            }
            return copy.homeHexalot ? this.withSelectedSpot(centerSpot) : this
        }
        if (homeHexalot) {
            if (!homeHexalot.occupied) {
                this.storage.setGenome(homeHexalot, freshGenome().genomeData)
            }
            return copy.withSelectedSpot(homeHexalot.centerSpot).withHomeHexalot(homeHexalot)
        }
        return copy.withMode(IslandMode.Visiting)
    }

    private withSelectedSpot(selectedSpot?: Spot): IslandState {
        const copy = this.copy
        copy.selectedSpot = selectedSpot
        copy.selectedHexalot = selectedSpot ? selectedSpot.centerOfHexalot : undefined
        return copy
    }

    private withSurface(surface: Surface): IslandState {
        const selectedSpot = this.selectedSpot
        if (!selectedSpot) {
            return this
        }
        selectedSpot.surface = surface
        const copy = this.copy
        const nextFree = selectedSpot.adjacentSpots.find(s => s.free && s.surface === Surface.Unknown)
        if (nextFree) {
            return copy.withSelectedSpot(nextFree)
        }
        const hexalot = selectedSpot.memberOfHexalot.length === 1 ? selectedSpot.memberOfHexalot[0] : undefined
        if (hexalot) {
            const selected = copy.withSelectedSpot(hexalot.centerSpot)
            if (this.legal && !hexalot.occupied) {
                hexalot.genome = freshGenome()
            }
            return hexalot.occupied ? selected.withHomeHexalot(hexalot) : selected.withMode(IslandMode.Visiting)
        }
        return copy
    }

    private withGotchi(gotchi: Gotchi, journey?: Journey): IslandState {
        this.recycle()
        const copy = this.copy
        copy.gotchi = gotchi
        copy.islandMode = journey ? IslandMode.DrivingJourney : IslandMode.DrivingFree
        copy.journey = journey
        return copy
    }

    private withEvolution(evolution: Evolution): IslandState {
        this.recycle()
        const copy = this.copy
        copy.evolution = evolution
        copy.islandMode = IslandMode.Evolving
        return copy
    }

    private dispatch(): void {
        this.island.state = this
        this.subject.next(this)
    }

    private get withFreeHexalotsRemoved(): IslandState {
        this.island.removeFreeHexalots()
        return this // todo: no change of state?
    }

    private withHomeHexalot(hexalot?: Hexalot): IslandState {
        const copy = this.copy.withSelectedSpot(hexalot ? hexalot.centerSpot : undefined)
        copy.homeHexalot = hexalot
        copy.islandMode = copy.homeHexalot ? IslandMode.Landed : IslandMode.Visiting
        return copy
    }

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
            this.storage,
            this.islandMode,
            this.legal,
            this.homeHexalot,
            this.selectedSpot,
            this.selectedHexalot,
            this.gotchi,
            this.evolution,
            this.journey,
        )
        ditto.subject = this.subject
        return ditto
    }
}
