/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole, roleToLengthFeature, SurfaceCharacter } from "./fabric-engine"
import { FEATURE_CONFIGS } from "./fabric-features"
import { addNameToCode, codeToTenscript, ITenscript } from "./tenscript"

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

const VERSION = "2019-11-27"

export interface IFeatureValue {
    numeric: number
    percent: number,
}

export interface IFabricState {
    version: string,
    nonce: number
    surfaceCharacter: SurfaceCharacter
    featureValues: Record<FabricFeature, IFeatureValue>
    recentCode: Record<string, string>,
    controlTab: ControlTab
    selectionMode: boolean
    fullScreen: boolean
    ellipsoids: boolean
    rotating: boolean
    showPushes: boolean
    showPulls: boolean
}

export function addRecentCode(state: IFabricState, {code, name}: ITenscript): IFabricState {
    const recentCode = {...state.recentCode}
    recentCode[name] = addNameToCode(code, name)
    return transition(state, {recentCode})
}

export function getRecentTenscript(state: IFabricState): ITenscript[] {
    return Object.keys(state.recentCode).map(key => {
        const code = state.recentCode[key]
        const tenscript = codeToTenscript(error => console.error(error), false, code)
        if (!tenscript) {
            throw new Error(`Unable to read recent tenscript code: ${code}`)
        }
        return tenscript
    })
}

export function roleDefaultLength(featureValues: Record<FabricFeature, IFeatureValue>, intervalRole: IntervalRole): number {
    if (intervalRole === IntervalRole.FacePull) {
        throw new Error()
    }
    return featureValues[roleToLengthFeature(intervalRole)].numeric
}

export function transition(state: IFabricState, partial: Partial<IFabricState>): IFabricState {
    return {...state, nonce: state.nonce + 1, ...partial}
}

const INITIAL_FABRIC_STATE: IFabricState = {
    version: VERSION,
    nonce: 0,
    surfaceCharacter: SurfaceCharacter.Frozen,
    featureValues: FEATURE_CONFIGS.reduce((record, config) => {
        record[config.feature] = ({percent: 100, numeric: config.defaultValue})
        return record
    }, {} as Record<FabricFeature, IFeatureValue>),
    recentCode: {},
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
