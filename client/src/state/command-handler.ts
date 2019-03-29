/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Direction } from "../body/fabric-exports"
import { freshGenome, IGenomeData } from "../genetics/genome"
import { Evolution } from "../gotchi/evolution"
import { Jockey } from "../gotchi/jockey"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { extractIslandData, isIslandLegal, isSpotLegal, Surface } from "../island/island-logic"

import { Command, IAppState, Mode } from "./app-state"
import { Transition } from "./transition"

export class CommandHandler {

    private trans: Transition

    constructor(appState: IAppState) {
        this.trans = new Transition(appState)
    }

    public async afterCommand(command: Command, location: Vector3): Promise<IAppState> {

        const trans = this.trans
        const state = trans.state
        const homeHexalot = state.homeHexalot
        const hexalot = state.selectedHexalot
        const jockey = state.jockey
        const freeGotchi = state.gotchi
        const gotchi = freeGotchi ? freeGotchi : jockey ? jockey.gotchi : undefined
        const journey = state.journey
        const spot = state.selectedSpot
        const island = state.island
        const vacant = island.vacantHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (command) {


            case Command.SaveGenome: // ================================================================================
                if (homeHexalot && gotchi) {
                    const genomeData = gotchi.genomeData
                    await state.storage.setGenomeData(homeHexalot, genomeData)
                }
                return state


            case Command.RandomGenome: // ==============================================================================
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                return state


            case Command.Return: // ====================================================================================
                if (state.jockey) {
                    return (await trans.withSelectedSpot(state.jockey.gotchi.home.centerSpot)).withMode(Mode.Landed).state
                }
                if (state.gotchi) {
                    return (await trans.withSelectedSpot(state.gotchi.home.centerSpot)).withMode(Mode.Landed).state
                }
                if (homeHexalot) {
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).withMode(Mode.Landed).state
                }
                return state


            case Command.PrepareToRide: // =============================================================================
                return trans.withMode(Mode.PreparingRide).state


            case Command.RideFree: // =================================================================================
                if (hexalot) {
                    const newbornGotchi = hexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return trans.withGotchi(newbornGotchi).state
                    }
                }
                return state


            case Command.RideJourney: // ==============================================================================
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (!firstLeg) {
                        return state
                    }
                    homeHexalot.centerSpot.adjacentSpots.forEach((adjacentSpot, index) => {
                        const adhacentHexalot = adjacentSpot.centerOfHexalot
                        if (adhacentHexalot && firstLeg.goTo.id === adhacentHexalot.id) {
                            homeHexalot.rotation = index
                        }
                    })
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    console.log("creating gotchi", firstLeg, newbornGotchi)
                    if (newbornGotchi) {
                        const newJockey = new Jockey(newbornGotchi, firstLeg)
                        return trans.withJockey(newJockey).state
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
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).state
                }
                return state


            case Command.RotateRight: // ===============================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).state
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
                    return (await trans.withSurface(Surface.Land)).withRestructure.state
                }
                return state


            case Command.MakeWater: // =================================================================================
                if (spot && spot.free) {
                    return (await trans.withSurface(Surface.Water)).withRestructure.state
                }
                return state


            case Command.JumpToFix: // =================================================================================
                const unknownSpot = island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    return (await trans.withSelectedSpot(unknownSpot)).state
                }
                const illegalSpot = island.spots.find(s => !isSpotLegal(s))
                if (illegalSpot) {
                    return (await trans.withSelectedSpot(illegalSpot)).state
                }
                return state


            case Command.AbandonFix: // ================================================================================
                const nonce = island.state.nonce + 1
                const homeHexalotId = homeHexalot ? homeHexalot.id : undefined
                const orig = new Island(extractIslandData(island), island.gotchiFactory, state.storage, nonce, homeHexalotId)
                return (await trans.withSelectedSpot()).withIsland(orig).withMode(Mode.Visiting).withRestructure.state


            case Command.ClaimHexalot: // ==============================================================================
                if (!homeHexalot && hexalot && isIslandLegal(island) && (singleHexalot || vacant && vacant.id === hexalot.id)) {
                    const newState = await CommandHandler.claimHexalot(state, hexalot)
                    if (newState) {
                        return newState
                    }
                }
                return state


            case Command.PlanJourney: // ===============================================================================
                return trans.withMode(Mode.PlanningJourney).state


            default: // ================================================================================================
                throw new Error("Unknown command!")


        }
    }

    private static async claimHexalot(state: IAppState, hexalot: Hexalot): Promise<IAppState | undefined> {
        const islandData = await state.storage.claimHexalot(state.island, hexalot, freshGenome().genomeData)
        if (!islandData) {
            console.warn("No island data arrived")
            return
        }
        const island = new Island(islandData, state.island.gotchiFactory, state.storage, state.nonce, hexalot.id)
        return island.state
    }
}

