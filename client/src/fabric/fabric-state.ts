/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter } from "./fabric-engine"

export enum LifePhase {
    Busy = 0,
    Growing = 1,
    Shaping = 2,
    Slack = 3,
    Pretensing = 4,
    Pretenst = 5,
}

export function doNotClick(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Slack
}

export function hideSurface(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Shaping || lifePhase === LifePhase.Slack
}

export enum ControlTab {
    Grow = "Grow",
    Shape = "Shape",
    Optimize = "Optimize",
}

export function enumValues(e: object): number[] {
    return Object.keys(e).filter(k => k.length > 1).map(k => e[k])
}

const VERSION = "2019-11-20"

export interface IFabricState {
    version: string,
    nonce: number
    surfaceCharacter: SurfaceCharacter
    controlTab: ControlTab
    selectionMode: boolean
    fullScreen: boolean
    ellipsoids: boolean
    rotating: boolean
    showPushes: boolean
    showPulls: boolean
}

export function transition(state: IFabricState, partial: Partial<IFabricState>): IFabricState {
    return {...state, nonce: state.nonce + 1, ...partial}
}

const INITIAL_FABRIC_STATE: IFabricState = {
    version: VERSION,
    nonce: 0,
    surfaceCharacter: SurfaceCharacter.Sticky,
    controlTab: ControlTab.Grow,
    fullScreen: true,
    selectionMode: false,
    ellipsoids: false,
    rotating: false,
    showPushes: true,
    showPulls: true,
}

const FABRIC_STATE_KEY = "FabricState"

export function saveFabricState(fabricState: IFabricState): void {
    localStorage.setItem(FABRIC_STATE_KEY, JSON.stringify(fabricState))
}

export function loadFabricState(): IFabricState {
    const item = localStorage.getItem(FABRIC_STATE_KEY)
    if (item) {
        const storedState = JSON.parse(item) as IFabricState
        if (storedState.version === VERSION) {
            return storedState
        }
    }
    return INITIAL_FABRIC_STATE
}
