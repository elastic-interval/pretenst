import {Vector3} from "three"

import {Direction} from "../body/fabric-exports"
import {freshGenome, IGenomeData} from "../genetics/genome"
import {Evolution} from "../gotchi/evolution"

import {Hexalot} from "./hexalot"
import {Command, IslandMode, IslandState} from "./island-state"
import {Journey} from "./journey"
import {Surface} from "./spot"

export class IslandStateCommand {

    constructor(private state: IslandState) {
    }

    public stateAfterCommand(command: Command, location: Vector3): IslandState {
        const state = this.state
        const homeHexalot = state.homeHexalot
        const gotchi = state.gotchi
        const journey = state.journey
        const selectedSpot = state.selectedSpot
        switch (command) {
            case Command.Logout:
                return this.Logout()
            case Command.SaveGenome:
                if (homeHexalot && gotchi) {
                    const genomeData = gotchi.genomeData
                    state.storage.setGenome(homeHexalot, genomeData)
                }
                return state
            case Command.RandomGenome:
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                return state
            case Command.ReturnHome:
                if (homeHexalot) {
                    return this.ReturnHome(homeHexalot)
                }
                return state
            case Command.PlanFreeDrive:
                return state.withMode(IslandMode.PlanningDrive)
            case Command.DriveFree:
                if (homeHexalot) {
                    return this.DriveFree(homeHexalot)
                }
                return state
            case Command.DriveJourney:
                if (homeHexalot && journey) {
                    return this.DriveJourney(homeHexalot, journey)
                }
                return state
            case Command.Evolve:
                if (homeHexalot && journey) {
                    return this.Evolve(homeHexalot, journey)
                }
                return state
            case Command.ForgetJourney:
                if (homeHexalot) {
                    this.ForgetJourney(homeHexalot)
                }
                return state
            case Command.RotateLeft:
                if (homeHexalot) {
                    return this.Rotate(homeHexalot, true)
                }
                return state
            case Command.RotateRight:
                if (homeHexalot) {
                    return this.Rotate(homeHexalot, false)
                }
                return state
            case Command.ComeHere:
                if (gotchi) {
                    gotchi.approach(location, true)
                }
                return state
            case Command.GoThere:
                if (gotchi) {
                    gotchi.approach(location, false)
                }
                return state
            case Command.StopMoving:
                if (gotchi) {
                    gotchi.nextDirection = Direction.REST
                }
                return state
            case Command.MakeLand:
                if (selectedSpot && selectedSpot.free) {
                    state.withSurface(Surface.Land).withRestructure().dispatch()
                }
                return state
            case Command.MakeWater:
                if (selectedSpot && selectedSpot.free) {
                    state.withSurface(Surface.Water).withRestructure().dispatch()
                }
                return state
            case Command.JumpToFix:
                const unknownSpot = state.island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    this.state.withSelectedSpot(unknownSpot).dispatch()
                }
                return state
            case Command.AbandonFix:
                state.withFreeHexalotsRemoved.dispatch()
                return state
            case Command.ClaimHexalot:
                if (!homeHexalot && selectedSpot && selectedSpot.available) {
                    const withNewHexalot = this.state.withNewHexalotAt(selectedSpot)
                    const hexalot = withNewHexalot.selectedHexalot
                    if (hexalot) {
                        this.state.storage.setGenome(hexalot, freshGenome().genomeData)
                    }
                    withNewHexalot.island.save()
                    withNewHexalot.withRestructure().dispatch()
                }
                return state
            case Command.PlanJourney:
                return state.withMode(IslandMode.PlanningJourney)
            default:
                throw new Error("Unknown command!")
        }
    }

    private Rotate(homeHexalot: Hexalot, right: boolean): IslandState {
        homeHexalot.rotate(true)
        return this.state.withSelectedSpot(homeHexalot.centerSpot) // todo: rotation
    }

    private ForgetJourney(homeHexalot: Hexalot): IslandState {
        homeHexalot.journey = undefined
        this.state.journey = undefined
        this.state.storage.saveJourney(homeHexalot)
        return this.state
    }

    private Evolve(homeHexalot: Hexalot, journey: Journey): IslandState {
        const firstLeg = journey.firstLeg
        if (firstLeg) {
            const saveGenome = (genomeData: IGenomeData) => this.state.storage.setGenome(homeHexalot, genomeData)
            const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
            return this.state.withEvolution(evolution)
        } else {
            return this.state
        }

    }

    private DriveJourney(homeHexalot: Hexalot, journey: Journey): IslandState {
        const newbornGotchi = homeHexalot.createNativeGotchi()
        if (newbornGotchi) {
            return this.state.withGotchi(newbornGotchi, journey)
        } else {
            return this.state
        }

    }

    private DriveFree(homeHexalot: Hexalot): IslandState {
        const newbornGotchi = homeHexalot.createNativeGotchi()
        if (newbornGotchi) {
            return this.state.withGotchi(newbornGotchi)
        } else {
            return this.state
        }
    }

    private ReturnHome(homeHexalot: Hexalot): IslandState {
        return this.state.withSelectedSpot(homeHexalot.centerSpot).withMode(IslandMode.Landed)

    }

    private Logout(): IslandState {
        return this.state.withHomeHexalot().withRestructure()
    }
}

