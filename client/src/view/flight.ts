/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { PerspectiveCamera, Vector3 } from "three"
import { OrbitControls } from "three-orbitcontrols-ts"

import { AppMode, IAppState } from "../state/app-state"
import { Transition } from "../state/transition"

export const INITIAL_DISTANCE = 15000
export const MINIMUM_DISTANCE = 7
export const ANGLE_ABOVE_HORIZON = Math.PI * 5 / 12

const CLOSE_ENOUGH = 100
const LOW_ENOUGH = 30
const TRACKING_DISTANCE = 15
const FIXING_DISTANCE = 650
const EDITING_DISTANCE = 550

const UPWARDS = 0.3
const TOWARDS_ABOVE = 0.001
const TOWARDS_TARGET = 0.05
const TOWARDS_HEIGHT = 0.06
const TOWARDS_DISTANCE = 0.025

export class Flight {
    private target = new Vector3()
    private targetToCamera = new Vector3()
    private targetToMovingTarget = new Vector3()
    private lastChanged = Date.now()

    constructor(private orbit: OrbitControls, target: Vector3) {
        orbit.enabled = false
        orbit.minPolarAngle = Math.PI * 0.01
        orbit.maxPolarAngle = 0.95 * Math.PI / 2
        orbit.maxDistance = INITIAL_DISTANCE - CLOSE_ENOUGH * 5
        orbit.minDistance = MINIMUM_DISTANCE
        orbit.enableKeys = false
        orbit.zoomSpeed = 0.5
        orbit.target = this.target
        const updateLastChanged = () => this.lastChanged = Date.now()
        orbit.addEventListener("start", updateLastChanged)
        orbit.addEventListener("end", updateLastChanged)
        orbit.addEventListener("change", updateLastChanged)
        this.target.add(target)
    }

    public setupCamera(): void {
        this.camera.position.set(
            0,
            INITIAL_DISTANCE * Math.sin(ANGLE_ABOVE_HORIZON),
            INITIAL_DISTANCE * Math.cos(ANGLE_ABOVE_HORIZON),
        )
    }

    public get changing(): boolean {
        return Date.now() - this.lastChanged < 100
    }

    public update(appState: IAppState, target?: Vector3): void {
        switch (appState.appMode) {
            case AppMode.Retreating:
                break
            case AppMode.Approaching:
                const distanceVariation = CLOSE_ENOUGH * 0.1
                const followDistance = this.followCameraDistance(
                    CLOSE_ENOUGH,
                    CLOSE_ENOUGH - distanceVariation,
                    CLOSE_ENOUGH + distanceVariation,
                )
                const heightVariation = LOW_ENOUGH * 0.1
                const followHeight = this.followCameraHeight(
                    LOW_ENOUGH,
                    LOW_ENOUGH - heightVariation,
                    LOW_ENOUGH + heightVariation,
                )
                if (!(followDistance || followHeight)) {
                    this.orbit.enabled = true
                    appState.updateState(new Transition(appState).withAppMode(AppMode.Exploring).appState)
                }
                break
            case AppMode.Riding:
            case AppMode.Evolving:
                this.moveTowardsTarget(target)
                const targetHeightVariation = 1
                const cameraHeight = this.target.y
                this.followCameraHeight(
                    cameraHeight,
                    cameraHeight - targetHeightVariation,
                    cameraHeight + targetHeightVariation,
                )
                const trackingDistanceVariation = 1
                this.followCameraDistance(
                    TRACKING_DISTANCE,
                    TRACKING_DISTANCE - trackingDistanceVariation,
                    TRACKING_DISTANCE + trackingDistanceVariation,
                )
                break
            case AppMode.FixingIsland:
                this.moveTowardsAbove()
                const fixingDistanceVariation = FIXING_DISTANCE * 0.1
                this.followCameraDistance(
                    FIXING_DISTANCE,
                    FIXING_DISTANCE - fixingDistanceVariation,
                    INITIAL_DISTANCE,
                )
                break
            case AppMode.EditingJourney:
                const editingDistanceVariation = EDITING_DISTANCE * 0.1
                this.moveTowardsAbove()
                this.followCameraDistance(
                    EDITING_DISTANCE,
                    EDITING_DISTANCE - editingDistanceVariation,
                    INITIAL_DISTANCE,
                )
                break
            case AppMode.Exploring:
                this.moveTowardsTarget(target)
                break
        }
        this.stayUpright()
        this.orbit.update()
    }

// =================================================================================================================

    private stayUpright(): void {
        const up = this.camera.up
        up.y += UPWARDS
        up.normalize()
    }

    private moveTowardsAbove(): void {
        const polarAngle = this.orbit.getPolarAngle()
        const minPolarAngle = this.orbit.minPolarAngle
        if (polarAngle > minPolarAngle * 2) {
            this.orbit.rotateUp(TOWARDS_ABOVE * polarAngle / minPolarAngle)
        }
    }

    private moveTowardsTarget(movingTarget?: Vector3): void {
        if (!movingTarget) {
            return
        }
        this.target.add(this.targetToMovingTarget.subVectors(movingTarget, this.target).multiplyScalar(TOWARDS_TARGET))
    }

    private followCameraDistance(idealDistance: number, tooLow: number, tooHigh: number): boolean {
        const currentDistance = this.calculateTargetToCamera().length()
        if (currentDistance > tooLow && currentDistance < tooHigh) {
            return false
        }
        const nextDistance = currentDistance * (1 - TOWARDS_DISTANCE) + idealDistance * TOWARDS_DISTANCE
        this.targetToCamera.normalize().multiplyScalar(nextDistance)
        this.camera.position.addVectors(this.target, this.targetToCamera)
        return true
    }

    private followCameraHeight(idealHeight: number, tooLow: number, tooHigh: number): boolean {
        const position = this.camera.position
        if (position.y > tooLow && position.y < tooHigh) {
            return false
        }
        position.y = position.y * (1 - TOWARDS_HEIGHT) + idealHeight * TOWARDS_HEIGHT
        return true
    }

    private calculateTargetToCamera(): Vector3 {
        return this.targetToCamera.subVectors(this.camera.position, this.target)
    }

    private get camera(): PerspectiveCamera {
        return <PerspectiveCamera>this.orbit.object
    }
}
