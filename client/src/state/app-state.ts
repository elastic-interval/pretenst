/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IFabricExports } from "../body/fabric-exports"
import { Evolution } from "../gotchi/evolution"
import { Jockey } from "../gotchi/jockey"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { coordsToString } from "../island/island-logic"
import { Journey } from "../island/journey"
import { Spot } from "../island/spot"
import { IStorage } from "../storage/storage"

export interface IAppProps {
    fabricExports: IFabricExports
    storage: IStorage
    userId?: string
}

export type AppTransition = () => (Pick<IAppState, keyof IAppState>)

export interface IAppState {

    readonly nonce: number
    readonly appMode: AppMode
    readonly storage: IStorage
    readonly islandIsLegal: boolean

    readonly width: number
    readonly height: number
    readonly left: number
    readonly top: number
    readonly showInfo: boolean

    readonly island?: Island
    readonly homeHexalot?: Hexalot
    readonly ownedLots?: string[]
    readonly journey?: Journey
    readonly selectedSpot?: Spot
    readonly selectedHexalot?: Hexalot
    readonly jockey?: Jockey
    readonly evolution?: Evolution

    updateState(appState: IAppState): void

    transitionState(transition: AppTransition): void
}

export enum AppMode {
    Approaching = "Approaching",
    EditingJourney = "Editing journey",
    Evolving = "Evolving",
    Exploring = "Exploring",
    FixingIsland = "Fixing island",
    Riding = "Riding",
}

export enum Command {
    AbandonFix = "Abandon fix",
    ClaimHexalot = "Claim hexalot",
    ComeHere = "Come here",
    EditJourney = "Edit your journey",
    Evolve = "Evolve",
    GoHome = "Go home",
    GoThere = "Go there",
    MakeLand = "Make into land",
    MakeWater = "Make into water",
    RandomGenome = "Random genome",
    Ride = "Ride",
    RotateLeft = "Rotate left",
    RotateRight = "Rotate right",
    SaveGenome = "Save genome",
    StopMoving = "Stop moving",
    Terraform = "Terraform",
}

export function homeHexalotSelected(appState: IAppState): boolean {
    return !!appState.homeHexalot && !!appState.selectedHexalot
        && appState.homeHexalot.id === appState.selectedHexalot.id
}

export function logString(appState: IAppState): string {
    const legal = appState.islandIsLegal
    const home = !!appState.homeHexalot
    const who = appState.jockey ? "jockey" : appState.evolution ? "evolution" : "-"
    const spot = appState.selectedSpot ? coordsToString(appState.selectedSpot.coords) : "-"
    const lot = appState.selectedHexalot ? coordsToString(appState.selectedHexalot.coords) : "-"
    return `${appState.nonce}:${appState.appMode}: who=${who} legal=${legal} home=${home} spot=${spot} lot=${lot}`
}

export function updateDimensions(): object {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        left: window.screenLeft,
        top: window.screenTop,
    }
}

