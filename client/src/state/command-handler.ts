/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Direction } from "../body/fabric-exports"
import { freshGenome, fromGenomeData, IGenomeData } from "../genetics/genome"
import { Evolution } from "../gotchi/evolution"
import { Jockey } from "../gotchi/jockey"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { extractIslandData, isIslandLegal, isSpotLegal, Surface } from "../island/island-logic"

import { Command, IslandState, Mode } from "./island-state"
import { Transition } from "./transition"

export class CommandHandler {

    private trans: Transition

    constructor(islandState: IslandState) {
        this.trans = new Transition(islandState)
    }

    public async afterCommand(command: Command, location: Vector3): Promise<IslandState> {

        const trans = this.trans
        const islandState = trans.islandState
        const homeHexalot = islandState.homeHexalot
        const hexalot = islandState.selectedHexalot
        const jockey = islandState.jockey
        const freeGotchi = islandState.gotchi
        const gotchi = freeGotchi ? freeGotchi : jockey ? jockey.gotchi : undefined
        const journey = islandState.journey
        const spot = islandState.selectedSpot
        const island = islandState.island
        const vacant = island.vacantHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (command) {


            case Command.SaveGenome: // ================================================================================
                if (homeHexalot && gotchi) {
                    const genomeData = gotchi.genomeData
                    await islandState.storage.setGenomeData(homeHexalot, genomeData)
                }
                return islandState


            case Command.RandomGenome: // ==============================================================================
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                return islandState


            case Command.Return: // ====================================================================================
                if (islandState.jockey) {
                    return (await trans.withSelectedSpot(islandState.jockey.gotchi.home.centerSpot)).withMode(Mode.Landed).islandState
                }
                if (islandState.gotchi) {
                    return (await trans.withSelectedSpot(islandState.gotchi.home.centerSpot)).withMode(Mode.Landed).islandState
                }
                if (homeHexalot) {
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).withMode(Mode.Landed).islandState
                }
                return islandState


            case Command.PrepareToRide: // =============================================================================
                return trans.withMode(Mode.PreparingRide).islandState


            case Command.RideFree: // =================================================================================
                if (hexalot) {
                    const newbornGotchi = hexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return trans.withGotchi(newbornGotchi).islandState
                    }
                }
                return islandState


            case Command.RideJourney: // ==============================================================================
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (!firstLeg) {
                        return islandState
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
                        return trans.withJockey(newJockey).islandState
                    }
                }
                return islandState


            case Command.Evolve: // ====================================================================================
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (data: IGenomeData) => {
                            homeHexalot.genome = fromGenomeData(data)
                            islandState.storage.setGenomeData(homeHexalot, data).then(() => {
                                console.log("genome saved")
                            })
                        }
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        return trans.withEvolution(evolution).islandState
                    }
                }
                return islandState


            case Command.ForgetJourney: // =============================================================================
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    islandState.storage.setJourneyData(homeHexalot, {hexalots: [homeHexalot.id]}).then(() => {
                        console.log("cleared journey")
                    })
                    return trans.withJourney().islandState
                }
                return islandState


            case Command.RotateLeft: // ================================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).islandState
                }
                return islandState


            case Command.RotateRight: // ===============================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).islandState
                }
                return islandState


            case Command.ComeHere: // ==================================================================================
                if (gotchi) {
                    gotchi.approach(location, true)
                }
                return islandState


            case Command.GoThere: // ===================================================================================
                if (gotchi) {
                    gotchi.approach(location, false)
                }
                return islandState


            case Command.StopMoving: // ================================================================================
                if (gotchi) {
                    gotchi.nextDirection = Direction.REST
                }
                return islandState


            case Command.MakeLand: // ==================================================================================
                if (spot && spot.free) {
                    return (await trans.withSurface(Surface.Land)).withRestructure.islandState
                }
                return islandState


            case Command.MakeWater: // =================================================================================
                if (spot && spot.free) {
                    return (await trans.withSurface(Surface.Water)).withRestructure.islandState
                }
                return islandState


            case Command.Terraform: // =================================================================================
                const unknownSpot = island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    return (await trans.withSelectedSpot(unknownSpot)).islandState
                }
                const illegalSpot = island.spots.find(s => !isSpotLegal(s))
                if (illegalSpot) {
                    return (await trans.withSelectedSpot(illegalSpot)).islandState
                }
                return islandState


            case Command.AbandonFix: // ================================================================================
                const nonce = island.islandState.nonce + 1
                const orig = new Island(extractIslandData(island), island.gotchiFactory, islandState.storage, nonce)
                return (await trans.withSelectedSpot()).withIsland(orig).withMode(Mode.Visiting).withRestructure.islandState


            case Command.ClaimHexalot: // ==============================================================================
                if (!homeHexalot && hexalot && isIslandLegal(island) && (singleHexalot || vacant && vacant.id === hexalot.id)) {
                    const newState = await CommandHandler.claimHexalot(islandState, hexalot)
                    if (newState) {
                        return newState
                    }
                }
                return islandState


            case Command.PlanJourney: // ===============================================================================
                return trans.withMode(Mode.PlanningJourney).islandState


            default: // ================================================================================================
                throw new Error("Unknown command!")


        }
    }

    private static async claimHexalot(islandState: IslandState, hexalot: Hexalot): Promise<IslandState | undefined> {
        const islandData = await islandState.storage.claimHexalot(islandState.island, hexalot, freshGenome().genomeData)
        if (!islandData) {
            console.warn("No island data arrived")
            return undefined
        }
        const island = new Island(islandData, islandState.island.gotchiFactory, islandState.storage, islandState.nonce)
        return (await new Transition(island.islandState).withHomeHexalot(hexalot)).withRestructure.islandState
    }
}

