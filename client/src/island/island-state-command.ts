import {Vector3} from "three"

import {Direction} from "../body/fabric-exports"
import {freshGenome, IGenomeData} from "../genetics/genome"
import {Evolution} from "../gotchi/evolution"

import {Hexalot} from "./hexalot"
import {Island} from "./island"
import {Command, IslandMode, IslandState} from "./island-state"
import {Surface} from "./spot"

export class IslandStateCommand {

    constructor(private state: IslandState) {
    }

    public stateAfterCommand(command: Command, location: Vector3): IslandState {

        const state = this.state
        const homeHexalot = state.homeHexalot
        const hexalot = state.selectedHexalot
        const gotchi = state.gotchi
        const journey = state.journey
        const spot = state.selectedSpot
        const vacant = state.island.vacantHexalot

        switch (command) {


            case Command.Logout: // ====================================================================================
                return this.state.withHomeHexalot().withRestructure


            case Command.SaveGenome: // ================================================================================
                if (homeHexalot && gotchi) {
                    const genomeData = gotchi.genomeData
                    state.storage.setGenomeData(homeHexalot, genomeData).then(() => {
                        console.log("genome saved")
                    })
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


            case Command.PrepareDrive: // =============================================================================
                return state.withMode(IslandMode.PreparingDrive)


            case Command.DriveFree: // =================================================================================
                if (hexalot) {
                    const newbornGotchi = hexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return this.state.withGotchi(newbornGotchi)
                    }
                }
                return state


            case Command.DriveJourney: // ==============================================================================
                // TODO: attach journey to a gotchi
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
                        const saveGenome = (data: IGenomeData) => {
                            this.state.storage.setGenomeData(homeHexalot, data).then(() => {
                                console.log("genome saved")
                            })
                        }
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        return this.state.withEvolution(evolution)
                    }
                }
                return state


            case Command.ForgetJourney: // =============================================================================
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    this.state.journey = undefined
                    this.state.storage.setJourneyData(homeHexalot, {hexalots: [homeHexalot.id]}).then(() => {
                        console.log("cleared journey")
                    })
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
                state.island.vacantHexalot = undefined
                return state.withSelectedSpot().withMode(IslandMode.Visiting).withRestructure


            case Command.ClaimHexalot: // ==============================================================================
                if (!homeHexalot && hexalot && vacant && vacant.id === hexalot.id) {
                    if (hexalot) {
                        this.claimHexalot(hexalot, state) // todo: handle failure
                    }
                    state.island.vacantHexalot = undefined
                    return state.withHomeHexalot(hexalot).withRestructure
                }
                return state


            case Command.PlanJourney: // ===============================================================================
                return state.withMode(IslandMode.PlanningJourney)


            default: // ================================================================================================
                throw new Error("Unknown command!")


        }
    }

    private claimHexalot(hexalot: Hexalot, state: IslandState): void {
        state.storage.claimHexalot(state.island, hexalot, freshGenome().genomeData).then(islandData => {
            if (!islandData) {
                return
            }
            console.warn("new island")
            const island = new Island(
                state.subject,
                islandData,
                state.island.gotchiFactory,
                state.storage,
            )
            const newHomeHexalot = island.findHexalot(hexalot.id)
            if (newHomeHexalot) {
                console.log("new home hexalot", newHomeHexalot)
                island.state.subject.next(island.state
                    .withHomeHexalot(newHomeHexalot)
                    .withSelectedSpot(newHomeHexalot.centerSpot)
                    .withRestructure)
            } else {
                console.warn("no new home hexalot!")
                island.state.dispatch()
            }
        })
    }
}

