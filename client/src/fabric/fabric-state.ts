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

export enum GravityCharacter {
    Light,
    Medium,
    Heavy,
    Space,
}

export const GRAVITY = [
    0.00000005,
    0.0000002,
    0.0000004,
    0.0,
]

export enum DragCharacter {
    Light,
    Medium,
    Heavy,
    Free,
}

export const DRAG = [
    0.0001,
    0.001,
    0.01,
    0.0,
]

export enum ControlTab {
    Generate = "Generate",
    Pretense = "Pretense",
    Features = "Features",
}

export function enumValues(e: object): number[] {
    return Object.keys(e).filter(k => k.length > 1).map(k => e[k])
}

export interface IFabricState {
    nonce: number
    gravityCharacter: GravityCharacter
    dragCharacter: DragCharacter
    surfaceCharacter: SurfaceCharacter
    rotating: boolean
    frozen: boolean
    showPushes: boolean
    showPulls: boolean
    fullScreen: boolean
}

const INITIAL_FABRIC_STATE: IFabricState = {
    nonce: 0,
    gravityCharacter: GravityCharacter.Light,
    dragCharacter: DragCharacter.Light,
    surfaceCharacter: SurfaceCharacter.Sticky,
    rotating: false,
    frozen: false,
    showPushes: true,
    showPulls: true,
    fullScreen: false,
}

const FABRIC_STATE_KEY = "FabricState"

export function saveFabricState(fabricState: IFabricState): void {
    localStorage.setItem(FABRIC_STATE_KEY, JSON.stringify(fabricState))
}

export function loadFabricState(): IFabricState {
    const item = localStorage.getItem(FABRIC_STATE_KEY)
    if (item) {
        return JSON.parse(item) as IFabricState
    }
    return INITIAL_FABRIC_STATE
}
