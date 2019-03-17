import {Vector3} from "three"

import {Direction} from "../body/fabric-exports"
import {freshGenome, IGenomeData} from "../genetics/genome"
import {Evolution} from "../gotchi/evolution"

import {Command, IslandMode, IslandState} from "./island-state"
import {Surface} from "./spot"

export class IslandStateCommand {

    constructor(private state: IslandState) {
    }

    public stateAfterCommand(command: Command, location: Vector3): IslandState {

        const state = this.state
        const homeHexalot = state.homeHexalot
        const selectedHexalot = state.selectedHexalot
        const gotchi = state.gotchi
        const journey = state.journey
        const spot = state.selectedSpot

        switch (command) {


            case Command.Logout: // ====================================================================================
                return this.state.withHomeHexalot().withRestructure


            case Command.SaveGenome: // ================================================================================
                if (homeHexalot && gotchi) {
                    const genomeData = gotchi.genomeData
                    state.storage.setGenome(homeHexalot, genomeData)
                }
                return state


            case Command.RandomGenome: // ==============================================================================
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                return state


            case Command.Return: // ====================================================================================
                if (state.gotchi) {
                    return this.state.withSelectedSpot(state.gotchi.home.centerSpot).withMode(IslandMode.Landed)
                }
                if (homeHexalot) {
                    return this.state.withSelectedSpot(homeHexalot.centerSpot).withMode(IslandMode.Landed)
                }
                return state


            case Command.PlanFreeDrive: // =============================================================================
                return state.withMode(IslandMode.PlanningDrive)


            case Command.DriveFree: // =================================================================================
                if (selectedHexalot) {
                    const newbornGotchi = selectedHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return this.state.withGotchi(newbornGotchi)
                    }
                }
                return state


            case Command.DriveJourney: // ==============================================================================
                if (homeHexalot && journey) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return this.state.withGotchi(newbornGotchi, journey)
                    }
                }
                return state


            case Command.Evolve: // ====================================================================================
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (data: IGenomeData) => this.state.storage.setGenome(homeHexalot, data)
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        return this.state.withEvolution(evolution)
                    }
                }
                return state


            case Command.ForgetJourney: // =============================================================================
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    this.state.journey = undefined
                    this.state.storage.saveJourney(homeHexalot)
                    return this.state
                }
                return state


            case Command.RotateLeft: // ================================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    return this.state.withSelectedSpot(homeHexalot.centerSpot) // todo: rotation
                }
                return state


            case Command.RotateRight: // ===============================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    return this.state.withSelectedSpot(homeHexalot.centerSpot) // todo: rotation
                }
                return state


            case Command.ComeHere: // ==================================================================================
                if (gotchi) {
                    gotchi.approach(location, true)
                }
                return state


            case Command.GoThere: // ===================================================================================
                if (gotchi) {
                    gotchi.approach(location, false)
                }
                return state


            case Command.StopMoving: // ================================================================================
                if (gotchi) {
                    gotchi.nextDirection = Direction.REST
                }
                return state


            case Command.MakeLand: // ==================================================================================
                if (spot && spot.free) {
                    return state.withSurface(Surface.Land).withRestructure
                }
                return state


            case Command.MakeWater: // =================================================================================
                if (spot && spot.free) {
                    return state.withSurface(Surface.Water).withRestructure
                }
                return state


            case Command.JumpToFix: // =================================================================================
                const unknownSpot = state.island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    return this.state.withSelectedSpot(unknownSpot)
                }
                return state


            case Command.AbandonFix: // ================================================================================
                return state.withSelectedSpot().withFreeHexalotsRemoved.withMode(IslandMode.Visiting).withRestructure


            case Command.ClaimHexalot: // ==============================================================================
                if (spot) {
                    if (!homeHexalot && spot.canBeClaimed) {
                        const withNewHexalot = this.state.withNewHexalotAt(spot)
                        const hexalot = withNewHexalot.selectedHexalot
                        if (hexalot) {
                            const genome = freshGenome()
                            hexalot.genome = genome
                            this.state.storage.setGenome(hexalot, genome.genomeData)
                        }
                        withNewHexalot.island.save()
                        return withNewHexalot.withRestructure.withHomeHexalot(hexalot)
                    }
                }
                return state


            case Command.PlanJourney: // ===============================================================================
                return state.withMode(IslandMode.PlanningJourney)


            default: // ================================================================================================
                throw new Error("Unknown command!")


        }
    }
}

