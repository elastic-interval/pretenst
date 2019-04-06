/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Journey } from "../island/journey"
import { Spot } from "../island/spot"

import { AppMode, IAppState } from "./app-state"
import { Transition } from "./transition"

export class ClickHandler {

    private trans: Transition

    constructor(appState: IAppState, private userId?: string) {
        this.trans = new Transition(appState)
    }

    public async stateAfterClick(spot: Spot): Promise<IAppState> {

        const trans = this.trans
        const hexalot = spot.centerOfHexalot
        const appState = trans.appState
        const homeHexalot = appState.homeHexalot
        const island = appState.island
        if (!island) {
            return appState
        }

        const vacant = island.vacantHexalot

        switch (appState.appMode) {


            case AppMode.FixingIsland: // ===========================================================================
                return (await trans.withSelectedSpot(spot)).appState


            case AppMode.Exploring: // ===============================================================================
                if (this.userId && !homeHexalot && appState.islandIsLegal && spot.isCandidateHexalot(vacant)) {
                    island.vacantHexalot = island.createHexalot(spot)
                    return (await trans.withSelectedSpot(spot)).withAppMode(AppMode.FixingIsland).withRestructure.appState
                }
                if (hexalot) {
                    return (await trans.withSelectedSpot(hexalot.centerSpot)).appState
                }
                return appState


            case AppMode.Planning: // ========================================================================
                if (!homeHexalot) {
                    throw new Error("No home hexalot")
                }
                if (hexalot) {
                    if (!homeHexalot.journey) {
                        homeHexalot.journey = new Journey([homeHexalot, hexalot])
                    } else if (!homeHexalot.journey.truncateVisit(hexalot)) {
                        homeHexalot.journey.addVisit(hexalot)
                    }
                    appState.storage.setJourneyData(homeHexalot, homeHexalot.journey.data).then(() => {
                        console.log("saved journey")
                    })
                    return trans.withJourney(homeHexalot.journey).appState
                }
                return appState


            // =========================================================================================================
            case AppMode.Approaching:
            case AppMode.Retreating:
            case AppMode.Evolving:
            case AppMode.Riding:
                return appState


            default: // ================================================================================================
                return appState


        }
    }
}

