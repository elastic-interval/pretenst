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

export enum GravityLevel {
    Light,
    Medium,
    Heavy,
    Space,
}

export const GRAVITY_LEVEL = [
    0.00000005,
    0.0000001,
    0.0000003,
    0.0,
]

export enum DragLevel {
    Light,
    Medium,
    Heavy,
    Free,
}

export const DRAG_LEVEL = [
    0.0001,
    0.001,
    0.01,
    0.0,
]

export enum PretenseFactor {
    Tiny,
    Small,
    Medium,
    Large,
}

export const PRETENSE_FACTOR = [
    0.001,
    0.01,
    0.05,
    0.10,
]

export enum PretenseSpeed {
    Slow,
    Medium,
    Fast,
}

export const PRETENSE_SPEED = [
    30000,
    3000,
    300,
]

export enum PushStrainFactor {
    PushDominant,
    Equal,
    PullDominant,
}

export const PUSH_STRAIN_FACTOR = [
    3,
    1,
    1 / 3,
]

export enum ControlTab {
    Grow = "Grow",
    Shape = "Shape",
    Optimize = "Optimize",
    Explore = "Explore",
    // X = "X",
}

export function enumValues(e: object): number[] {
    return Object.keys(e).filter(k => k.length > 1).map(k => e[k])
}

export interface IFabricState {
    nonce: number
    gravityLevel: GravityLevel
    dragLevel: DragLevel
    surfaceCharacter: SurfaceCharacter
    pretenseFactor: PretenseFactor
    pretenseSpeed: PretenseSpeed
    pushStrainFactor: PushStrainFactor
    editMode: boolean
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
    nonce: 0,
    gravityLevel: GravityLevel.Light,
    dragLevel: DragLevel.Light,
    surfaceCharacter: SurfaceCharacter.Sticky,
    pretenseFactor: PretenseFactor.Tiny,
    pretenseSpeed: PretenseSpeed.Slow,
    pushStrainFactor: PushStrainFactor.Equal,
    fullScreen: false,
    editMode: false,
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
        return JSON.parse(item) as IFabricState
    }
    return INITIAL_FABRIC_STATE
}
