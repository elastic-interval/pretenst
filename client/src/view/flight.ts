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
            case AppMode.Approaching:
                if (Math.abs(distance - CLOSE_ENOUGH) < CLOSE_ENOUGH * 0.1 && (this.camera.position.y - LOW_ENOUGH) < LOW_ENOUGH * 0.1) {
                    this.orbit.enabled = true
                    appState.updateState(new Transition(appState).withAppMode(AppMode.Exploring).appState)
                    break
                }
                this.followCameraDistance(false, false, CLOSE_ENOUGH)
                this.followCameraHeight(true, LOW_ENOUGH)
                break
            case AppMode.Riding:
            case AppMode.Evolving:
                this.followTarget(target)
                this.followCameraHeight(false, this.target.y)
                this.followCameraDistance(false, false, TRACKING_DISTANCE)
                break
            case AppMode.FixingIsland:
                this.towardsAbove()
                this.followCameraDistance(true, false, FIXING_DISTANCE)
                break
            case AppMode.EditingJourney:
                this.towardsAbove()
                this.followCameraDistance(true, false, EDITING_DISTANCE)
                break
            case AppMode.Exploring:
                this.followTarget(target)
                break
        }
        this.orbit.update()
    }

    private towardsAbove(): void {
        const polarAngle = this.orbit.getPolarAngle()
        const minPolarAngle = this.orbit.minPolarAngle
        if (polarAngle > minPolarAngle * 2) {
            this.orbit.rotateUp(TOWARDS_ABOVE * polarAngle / minPolarAngle)
        }
    }

    private followTarget(movingTarget?: Vector3): void {
        if (movingTarget) {
            this.target.add(this.targetToMovingTarget.subVectors(movingTarget, this.target).multiplyScalar(TOWARDS_TARGET))
        }
    }

    private followCameraDistance(mayBeLarger: boolean, mayBeSmaller: boolean, idealDistance: number): void {
        const currentDistance = this.calculateTargetToCamera().length()
        if (mayBeLarger && currentDistance > idealDistance || mayBeSmaller && currentDistance < idealDistance) {
            return
        }
        const nextDistance = currentDistance * (1 - TOWARDS_DISTANCE) + idealDistance * TOWARDS_DISTANCE
        this.targetToCamera.normalize().multiplyScalar(nextDistance)
        this.camera.position.addVectors(this.target, this.targetToCamera)
    }

    private followCameraHeight(mayBeSmaller: boolean, idealHeight: number): void {
        const position = this.camera.position
        if (mayBeSmaller && position.y < idealHeight) {
            return
        }
        position.y = position.y * (1 - TOWARDS_HEIGHT) + idealHeight * TOWARDS_HEIGHT
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
