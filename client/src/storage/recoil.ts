/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter, WorldFeature } from "eig"
import { atom, RecoilState } from "recoil"
import { recoilPersist } from "recoil-persist"

import { globalModeFromUrl, IGlobalMode, WORLD_FEATURES } from "../fabric/eig-util"
import { ITenscript } from "../fabric/tenscript"
import { PostGrowthOp } from "../fabric/tensegrity"
import { IIntervalDetails, ITwist } from "../fabric/tensegrity-types"
import { featureMapping, IFeatureMapping } from "../view/feature-mapping"

export const STORAGE_KEY = "pretenst-2022-04-06"
const DEFAULT_BOOTSTRAP = 0

const {persistAtom} = recoilPersist({
    key: STORAGE_KEY,
    storage: localStorage,
})

// eslint-disable-next-line @typescript-eslint/tslint/config
const effects_UNSTABLE = [persistAtom]

export const postGrowthAtom = atom({
    key: "postGrowth",
    default: PostGrowthOp.NoOp,
    effects_UNSTABLE,
})

export const bootstrapIndexAtom = atom({
    key: "bootstrapIndex",
    default: DEFAULT_BOOTSTRAP,
    effects_UNSTABLE,
})

export const tenscriptAtom = atom<ITenscript | undefined>({
    key: "tenscript",
    default: undefined,
    effects_UNSTABLE,
})

export const currentFeature = atom<WorldFeature>({
    key: "currentFeature",
    default: WorldFeature.VisualStrain,
    effects_UNSTABLE,
})

function createWorldFeatureValues(): IWorldFeatureValue[] {
    return WORLD_FEATURES.map(feature => {
        const mapping = featureMapping(WorldFeature[feature])
        const percentAtom = atom({
            key: mapping.name,
            default: 100,
            effects_UNSTABLE,
        })
        return <IWorldFeatureValue>{mapping, percentAtom}
    })
}

export const rotatingAtom = atom({
    key: "rotating",
    default: false,
})

export const globalModeAtom = atom<IGlobalMode>({
    key: "globalMode",
    default: globalModeFromUrl(),
})

export enum ViewMode {
    Time = "Time",
    Select = "Select",
    Look = "Look",
}

export const viewModeAtom = atom<ViewMode>({
    key: "viewMode",
    default: ViewMode.Time,
})

export const surfaceCharacterAtom = atom({
    key: "surfaceCharacter",
    default: SurfaceCharacter.Frozen,
})

export interface IWorldFeatureValue {
    mapping: IFeatureMapping
    percentAtom: RecoilState<number>
}

export const FEATURE_VALUES = createWorldFeatureValues()

export const selectedTwistAtom = atom<ITwist | undefined>({
    key: "selectedTwist",
    default: undefined,
})

export const visibleDetailsAtom = atom<IIntervalDetails[]>({
    key: "visibleDetails",
    default: [],
})
