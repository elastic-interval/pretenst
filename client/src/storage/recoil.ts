/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default_world_feature, SurfaceCharacter, WorldFeature } from "eig"
import { atom } from "recoil"

import { featureConfig, IFeatureConfig, IntervalRole, WORLD_FEATURES } from "../fabric/eig-util"

export const demoModeAtom = atom({
    key: "demoMode",
    default: false,
})

export const tenscriptIndexAtom = atom({
    key: "tenscriptIndex",
    default: 0,
})

export const surfaceCharacterAtom = atom({
    key: "surfaceCharacter",
    default: SurfaceCharacter.Frozen,
})

export enum ControlTab {
    Script = "Script",
    Phase = "Phase",
    Shape = "Shape",
    Live = "Live",
    Frozen = "Frozen",
}

export const controlTabAtom = atom({
    key: "controlTab",
    default: ControlTab.Script,
})

export const rotatingAtom = atom({
    key: "rotating",
    default: false,
})

export enum ViewMode {
    Lines = "Lines",
    Selecting = "Selecting",
    Frozen = "Frozen",
}

export const viewModeAtom = atom<ViewMode>({
    key: "viewMode",
    default: ViewMode.Lines,
})

export const visibleRolesAtom = atom<IntervalRole[]>({
    key: "visibleRoles",
    default: [],
})

export const pushBottomAtom = atom({
    key: "pushBottom",
    default: 0,
})

export const pushTopAtom = atom({
    key: "pushTop",
    default: 1,
})

export const pullBottomAtom = atom({
    key: "pullBottom",
    default: 0,
})

export const pullTopAtom = atom({
    key: "pullTop",
    default: 1,
})

export interface IWorldFeatureValue {
    numeric: number
    percent: number
    defaultNumeric: number
    config: IFeatureConfig
}

function createWorldFeatures(): Record<WorldFeature, IWorldFeatureValue> {
    const features = {} as Record<WorldFeature, IWorldFeatureValue>
    WORLD_FEATURES.map(featureConfig).forEach(config => {
        features[config.feature] = {
            percent: 100,
            numeric: default_world_feature(config.feature),
            defaultNumeric: default_world_feature(config.feature),
            config,
        }
    })
    return features
}

export const worldFeaturesAtom = atom<Record<WorldFeature, IWorldFeatureValue>>({
    key: "worldFeatures",
    default: createWorldFeatures(),
})

//
// const STORED_STATE_KEY = "State"
//
// export function saveState(storedState: IStoredState): void {
//     localStorage.setItem(STORED_STATE_KEY, JSON.stringify(storedState))
// }
//
// export function loadState(toConfig: (feature: WorldFeature) => IFeatureConfig, defaultValue: (feature: WorldFeature) => number): IStoredState {
//     const item = localStorage.getItem(STORED_STATE_KEY)
//     if (item) {
//         const storedState = JSON.parse(item) as IStoredState
//         const {version, demoMode, tenscriptIndex} = storedState
//         if (version === VERSION) {
//             if (demoMode) {
//                 return initialStoredState(toConfig, defaultValue, demoMode, tenscriptIndex)
//             }
//             return storedState
//         }
//     }
//     return initialStoredState(toConfig, defaultValue, true, 0)
// }
