/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"

import { AppMode, Command } from "./state/app-state"

export enum AppEvent {
    FlyingIn = "Flying in",
    StartGrowth = "Start growth",
    GrowthStep = "Growth step",
    GrowthComplete = "Growth complete",
    Cycle = "Cycle",
    Command = "Command",
    AppMode = "App mode",
}

export interface IAppEvent {
    event: AppEvent,
    command?: Command
    appMode?: AppMode
}

export const APP_EVENT = new BehaviorSubject<IAppEvent>({event: AppEvent.FlyingIn})
