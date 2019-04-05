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
export const ANGLE_ABOVE_HORIZON = Math.PI / 12

const CLOSE_ENOUGH = 60
const TRACKING_DISTANCE = 15

const UPWARDS = 0.3
const TOWARDS_TARGET = 0.05
const TOWARDS_HEIGHT = 0.05
const TOWARDS_DISTANCE = 0.05
const DOLLY_SCALE_FACTOR = 0.005

export class Flight {
    private target = new Vector3()
    private targetToCamera = new Vector3()
    private targetToMovingTarget = new Vector3()
    private lastChanged = Date.now()

    constructor(private orbit: OrbitControls, target: Vector3) {
        orbit.enabled = false
        orbit.minPolarAngle = Math.PI * 0.1
        orbit.maxPolarAngle = 0.95 * Math.PI / 2
        orbit.maxDistance = INITIAL_DISTANCE
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
        const distance = this.distanceFromTarget
        if (distance < CLOSE_ENOUGH) {
            const up = this.camera.up
            up.y += UPWARDS
            up.normalize()
        }
        switch (appState.appMode) {
            case AppMode.Arriving:
                if (distance < CLOSE_ENOUGH) {
                    this.orbit.enabled = true
                    appState.updateState(new Transition(appState).withAppMode(AppMode.Visiting).appState)
                    break
                }
                const dollyScale = 1 + DOLLY_SCALE_FACTOR * (distance + CLOSE_ENOUGH * 2) / CLOSE_ENOUGH
                this.orbit.dollyIn(dollyScale)
                break
            case AppMode.RidingFree:
            case AppMode.RidingJourney:
            case AppMode.Evolving:
                this.followTarget(true, target)
                this.followCameraDistance(TRACKING_DISTANCE)
                break
            case AppMode.FixingIsland:
                break
            case AppMode.PlanningJourney:
                break
            case AppMode.PreparingRide:
                break
            case AppMode.Visiting:
                this.followTarget(false, target)
                break
        }
        this.orbit.update()
    }

    private followCameraDistance(idealDistance: number): void {
        const currentDistance = this.calculateTargetToCamera().length()
        const nextDistance = currentDistance * (1 - TOWARDS_DISTANCE) + idealDistance * TOWARDS_DISTANCE
        this.targetToCamera.normalize().multiplyScalar(nextDistance)
        this.camera.position.addVectors(this.target, this.targetToCamera)
    }

    private followTarget(sameHeight: boolean, movingTarget?: Vector3): void {
        if (movingTarget) {
            this.target.add(this.targetToMovingTarget.subVectors(movingTarget, this.target).multiplyScalar(TOWARDS_TARGET))
        }
        if (sameHeight) {
            const cameraHeight = this.camera.position.y
            const targetHeight = this.targetToCamera.y
            this.camera.position.y = cameraHeight * (1 - TOWARDS_HEIGHT) + targetHeight * TOWARDS_HEIGHT
        }
    }

    private get distanceFromTarget(): number {
        return this.camera.position.distanceTo(this.target)
    }

    private calculateTargetToCamera(): Vector3 {
        return this.targetToCamera.subVectors(this.camera.position, this.target)
    }

    private get camera(): PerspectiveCamera {
        return <PerspectiveCamera>this.orbit.object
    }

}
