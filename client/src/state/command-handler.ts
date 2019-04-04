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

import { AppMode, Command, IAppState } from "./app-state"
import { Transition } from "./transition"

export class CommandHandler {

    private trans: Transition

    constructor(appState: IAppState) {
        this.trans = new Transition(appState)
    }

    public async afterCommand(command: Command, location: Vector3): Promise<IAppState> {

        const trans = this.trans
        const appState = trans.appState
        const island = appState.island

        if (!island) {
            return this.trans.appState
        }

        const homeHexalot = appState.homeHexalot
        const hexalot = appState.selectedHexalot
        const jockey = appState.jockey
        const freeGotchi = appState.gotchi
        const gotchi = freeGotchi ? freeGotchi : jockey ? jockey.gotchi : undefined
        const journey = appState.journey
        const spot = appState.selectedSpot
        const vacant = island.vacantHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (command) {


            case Command.SaveGenome: // ================================================================================
                if (homeHexalot && gotchi) {
                    const genomeData = gotchi.genomeData
                    await appState.storage.setGenomeData(homeHexalot, genomeData)
                }
                return appState


            case Command.RandomGenome: // ==============================================================================
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                return appState


            case Command.Return: // ====================================================================================
                if (appState.jockey) {
                    return (await trans.withSelectedSpot(appState.jockey.gotchi.home.centerSpot)).withAppMode(AppMode.Landed).appState
                }
                if (appState.gotchi) {
                    return (await trans.withSelectedSpot(appState.gotchi.home.centerSpot)).withAppMode(AppMode.Landed).appState
                }
                if (homeHexalot) {
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).withAppMode(AppMode.Landed).appState
                }
                return appState


            case Command.PrepareToRide: // =============================================================================
                return trans.withAppMode(AppMode.PreparingRide).appState


            case Command.RideFree: // =================================================================================
                if (hexalot) {
                    const newbornGotchi = hexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        return trans.withGotchi(newbornGotchi).appState
                    }
                }
                return appState


            case Command.RideJourney: // ==============================================================================
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (!firstLeg) {
                        return appState
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
                        return trans.withJockey(newJockey).appState
                    }
                }
                return appState


            case Command.Evolve: // ====================================================================================
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (data: IGenomeData) => {
                            homeHexalot.genome = fromGenomeData(data)
                            appState.storage.setGenomeData(homeHexalot, data).then(() => {
                                console.log("genome saved")
                            })
                        }
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        return trans.withEvolution(evolution).appState
                    }
                }
                return appState


            case Command.ForgetJourney: // =============================================================================
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    appState.storage.setJourneyData(homeHexalot, {hexalots: [homeHexalot.id]}).then(() => {
                        console.log("cleared journey")
                    })
                    return trans.withJourney().appState
                }
                return appState


            case Command.RotateLeft: // ================================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).appState
                }
                return appState


            case Command.RotateRight: // ===============================================================================
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    return (await trans.withSelectedSpot(homeHexalot.centerSpot)).appState
                }
                return appState


            case Command.ComeHere: // ==================================================================================
                if (gotchi) {
                    gotchi.approach(location, true)
                }
                return appState


            case Command.GoThere: // ===================================================================================
                if (gotchi) {
                    gotchi.approach(location, false)
                }
                return appState


            case Command.StopMoving: // ================================================================================
                if (gotchi) {
                    gotchi.nextDirection = Direction.REST
                }
                return appState


            case Command.MakeLand: // ==================================================================================
                if (spot && spot.free) {
                    return (await trans.withSurface(Surface.Land)).withRestructure.appState
                }
                return appState


            case Command.MakeWater: // =================================================================================
                if (spot && spot.free) {
                    return (await trans.withSurface(Surface.Water)).withRestructure.appState
                }
                return appState


            case Command.Terraform: // =================================================================================
                const unknownSpot = island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    return (await trans.withSelectedSpot(unknownSpot)).appState
                }
                const illegalSpot = island.spots.find(s => !isSpotLegal(s))
                if (illegalSpot) {
                    return (await trans.withSelectedSpot(illegalSpot)).appState
                }
                return appState


            case Command.AbandonFix: // ================================================================================
                const nonce = appState.nonce + 1
                const orig = new Island(extractIslandData(island), island.gotchiFactory, appState.storage, nonce)
                return (await trans.withSelectedSpot()).withIsland(orig).withAppMode(AppMode.Visiting).withRestructure.appState


            case Command.ClaimHexalot: // ==============================================================================
                if (!homeHexalot && hexalot && isIslandLegal(island) && (singleHexalot || vacant && vacant.id === hexalot.id)) {
                    const newState = await CommandHandler.claimHexalot(appState, hexalot)
                    if (newState) {
                        return newState
                    }
                }
                return appState


            case Command.PlanJourney: // ===============================================================================
                return trans.withAppMode(AppMode.PlanningJourney).appState


            default: // ================================================================================================
                throw new Error("Unknown command!")


        }
    }

    private static async claimHexalot(appState: IAppState, hexalot: Hexalot): Promise<IAppState | undefined> {
        const existingIsland = appState.island
        if (!existingIsland) {
            console.warn("No existing island")
            return undefined
        }
        const islandData = await appState.storage.claimHexalot(existingIsland, hexalot, freshGenome().genomeData)
        if (!islandData) {
            console.warn("No island data arrived")
            return undefined
        }
        const mode = AppMode.Visiting
        const islandIsLegal = false
        const island = new Island(islandData, existingIsland.gotchiFactory, appState.storage, appState.nonce)
        const appStateClone: IAppState = {...appState, nonce: appState.nonce + 1, island, appMode: mode, islandIsLegal}
        return (await new Transition(appStateClone).withHomeHexalot(hexalot)).withRestructure.appState
    }
}

