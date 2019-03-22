/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Subject } from "rxjs"

import { Evolution } from "../gotchi/evolution"
import { Gotchi } from "../gotchi/gotchi"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { Journey } from "../island/journey"
import { Spot } from "../island/spot"
import { IStorage } from "../storage/storage"

export enum Command {
    AbandonFix = "Abandon fix",
    ClaimHexalot = "Claim hexalot",
    ComeHere = "Come here",
    DriveFree = "Drive free",
    DriveJourney = "Drive journey",
    Evolve = "Evolve",
    ForgetJourney = "Forget journey",
    GoThere = "Go there",
    JumpToFix = "Jump to fix",
    Logout = "Logout",
    MakeLand = "Make into land",
    MakeWater = "Make into water",
    PlanJourney = "Plan journey",
    PrepareDrive = "Prepare drive",
    RandomGenome = "Random genome",
    Return = "Return",
    RotateLeft = "Rotate left",
    RotateRight = "Rotate right",
    SaveGenome = "Save genome",
    StopMoving = "Stop moving",
}

export enum Mode {
    DrivingFree = "Driving free",
    DrivingJourney = "Driving journey",
    Evolving = "Evolving",
    FixingIsland = "Fixing island",
    Landed = "Landed",
    PlanningJourney = "Planning journey",
    PreparingDrive = "Preparing drive",
    Visiting = "Visiting",
}

export interface IAppState {
    readonly nonce: number
    readonly island: Island
    readonly storage: IStorage
    readonly subject: Subject<IAppState>
    readonly mode: Mode
    readonly islandIsLegal: boolean
    readonly homeHexalot?: Hexalot
    readonly journey?: Journey
    readonly selectedSpot?: Spot
    readonly selectedHexalot?: Hexalot
    readonly gotchi?: Gotchi
    readonly evolution?: Evolution
}

export function homeHexalotSelected(state: IAppState): boolean {
    return !!state.homeHexalot && !!state.selectedHexalot && state.homeHexalot.id === state.selectedHexalot.id
}

export function logString(state: IAppState): string {
    const legal = state.islandIsLegal
    const home = !!state.homeHexalot
    const spot = state.selectedSpot ? JSON.stringify(state.selectedSpot.coords) : "-"
    const lot = state.selectedHexalot ? JSON.stringify(state.selectedHexalot.coords) : "-"
    return `${state.nonce}:${state.mode}: legal=${legal} home=${home} spot=${spot} lot=${lot}`
}

