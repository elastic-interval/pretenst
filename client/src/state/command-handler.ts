/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Direction } from "../body/fabric-exports"
import { freshGenome, IGenomeData } from "../genetics/genome"
import { Evolution } from "../gotchi/evolution"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { Surface } from "../island/spot"

import { Command, IAppState, Mode } from "./app-state"
import { Transition } from "./transition"

export class CommandHandler {

    private trans: Transition

    constructor(state: IAppState) {
        this.trans = new Transition(state)
    }

    public afterCommand(command: Command, location: Vector3): IAppState {

        const trans = this.trans
        const state = trans.state
        const homeHexalot = state.homeHexalot
        const hexalot = state.selectedHexalot
        const gotchi = state.gotchi
        const journey = state.journey
        const spot = state.selectedSpot
        const island = state.island
        const vacant = island.vacantHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (command) {


            case Command.Logout: // ====================================================================================
                return trans.withHomeHexalot().withRestructure.state


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
                    return trans.withSelectedSpot(state.gotchi.home.centerSpot).withMode(Mode.Landed).state
                }
                if (homeHexalot) {
                    return trans.withSelectedSpot(homeHexalot.centerSpot).withMode(Mode.Landed).state
                }
                return state


            case Command.PrepareDrive: // =============================================================================
                return trans.withMode(Mode.PreparingDrive).state


            case Command.DriveFree: // =================================================================================
                if (hexalot) {
                    const newbornGotchi = hexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return trans.withGotchi(newbornGotchi).state
                    }
                }
                return state


            case Command.DriveJourney: // ==============================================================================
                // TODO: attach journey to a gotchi
                if (homeHexalot && journey) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return trans.withGotchi(newbornGotchi, journey).state
                    }
                }
                return state


            case Command.Evolve: // ====================================================================================
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (data: IGenomeData) => {
                            state.storage.setGenomeData(homeHexalot, data).then(() => {
                                console.log("genome saved")
                            })
                        }
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        return trans.withEvolution(evolution).state
                    }
                }
                return state


            case Command.ForgetJourney: // =============================================================================
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    state.storage.setJourneyData(homeHexalot, {hexalots: [homeHexalot.id]}).then(() => {
                        console.log("cleared journey")
                    })
                    return trans.withJourney().state
                }
                return state


            case Command.RotateLeft: // ================================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    return trans.withSelectedSpot(homeHexalot.centerSpot).state // todo: rotation
                }
                return state


            case Command.RotateRight: // ===============================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    return trans.withSelectedSpot(homeHexalot.centerSpot).state // todo: rotation
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
                    return trans.withSurface(Surface.Land).withRestructure.state
                }
                return state


            case Command.MakeWater: // =================================================================================
                if (spot && spot.free) {
                    return trans.withSurface(Surface.Water).withRestructure.state
                }
                return state


            case Command.JumpToFix: // =================================================================================
                const unknownSpot = island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    return trans.withSelectedSpot(unknownSpot).state
                }
                const illegalSpot = island.spots.find(s => !s.isLegal)
                if (illegalSpot) {
                    return trans.withSelectedSpot(illegalSpot).state
                }
                return state


            case Command.AbandonFix: // ================================================================================
                island.vacantHexalot = undefined
                return trans.withSelectedSpot().withMode(Mode.Visiting).withRestructure.state


            case Command.ClaimHexalot: // ==============================================================================
                if (!homeHexalot && hexalot && island.islandIsLegal && (singleHexalot || vacant && vacant.id === hexalot.id)) {
                    this.claimHexalot(hexalot, state) // todo: handle failure
                    island.vacantHexalot = undefined
                    return trans.withHomeHexalot(hexalot).withRestructure.state
                }
                return state


            case Command.PlanJourney: // ===============================================================================
                return trans.withMode(Mode.PlanningJourney).state


            default: // ================================================================================================
                throw new Error("Unknown command!")


        }
    }

    private claimHexalot(hexalot: Hexalot, state: IAppState): void {
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
                // TODO
                // island.state.withHomeHexalot(newHomeHexalot)
                //     .withSelectedSpot(newHomeHexalot.centerSpot)
                //     .withRestructure.dispatch()
            } else {
                console.warn("no new home hexalot!")
                // TODO
                // island.state.dispatch()
            }
        })
    }
}

