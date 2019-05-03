/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { PerspectiveCamera, Vector3 } from "three"
import { OrbitControls } from "three-orbitcontrols-ts"

import { AppMode, IAppState } from "../state/app-state"
import { Transition } from "../state/transition"

import { IFlightTarget } from "./flight-target"

export const INITIAL_DISTANCE = 15000
export const MINIMUM_DISTANCE = 7

const MIN_POLAR_ANGLE = Math.PI * 0.01
const MAX_POLAR_ANGLE = 0.98 * Math.PI / 2

export function polarAngle(aboveness: number): number { // aboveness [0,1]
    return (1 - aboveness) * MAX_POLAR_ANGLE + aboveness * MIN_POLAR_ANGLE
}

const ANGLE_ABOVE_HORIZON = Math.PI * 5 / 12

const TOWARDS_UPWARDS = 0.3
const TOWARDS_TARGET = 0.05
const TOWARDS_DISTANCE = 0.25
const TOWARDS_ABOVE = 0.01

export class Flight {
    private target = new Vector3()
    private targetToCamera = new Vector3()
    private targetToMovingTarget = new Vector3()

    constructor(private orbit: OrbitControls) {
        orbit.enabled = false
        orbit.minPolarAngle = MIN_POLAR_ANGLE
        orbit.maxPolarAngle = MAX_POLAR_ANGLE
        orbit.maxDistance = INITIAL_DISTANCE
        orbit.minDistance = MINIMUM_DISTANCE
        orbit.enableKeys = false
        orbit.zoomSpeed = 0.5
        orbit.target = this.target
    }

    public setupCamera(): void {
        this.camera.position.set(
            0,
            INITIAL_DISTANCE * Math.sin(ANGLE_ABOVE_HORIZON),
            INITIAL_DISTANCE * Math.cos(ANGLE_ABOVE_HORIZON),
        )
    }

    public update(appState: IAppState): void {
        const flightTarget = appState.flightTarget
        this.moveTowardsTarget(flightTarget.location)
        if (appState.appMode === AppMode.Flying) {
            const distanceChanged = this.cameraFollowDistance(flightTarget)
            const angleChanged = this.cameraFollowPolarAngle(flightTarget)
            if (!(distanceChanged || angleChanged)) {
                this.orbit.enabled = true
                appState.updateState(new Transition(appState).reachedFlightTarget(flightTarget).appState)
            }
        }
        this.stayUpright()
        this.orbit.update()
    }

    // ============================

    private stayUpright(): void {
        const up = this.camera.up
        up.y += TOWARDS_UPWARDS
        up.normalize()
    }

    private moveTowardsTarget(movingTarget: Vector3): void {
        this.target.add(this.targetToMovingTarget.subVectors(movingTarget, this.target).multiplyScalar(TOWARDS_TARGET))
    }

    private cameraFollowDistance(target: IFlightTarget): boolean {
        const currentDistance = this.calculateTargetToCamera().length()
        if (currentDistance > target.tooClose && currentDistance < target.tooFar) {
            return false
        }
        const nextDistance = currentDistance * (1 - TOWARDS_DISTANCE) + target.distance * TOWARDS_DISTANCE
        this.targetToCamera.normalize().multiplyScalar(nextDistance)
        this.camera.position.addVectors(this.target, this.targetToCamera)
        return true
    }

    private cameraFollowPolarAngle(target: IFlightTarget): boolean {
        const currentPolarAngle = this.orbit.getPolarAngle()
        if (currentPolarAngle < target.tooVertical) {
            this.orbit.rotateUp(-TOWARDS_ABOVE)
            return true
        }
        if (currentPolarAngle > target.tooHorizontal) {
            this.orbit.rotateUp(TOWARDS_ABOVE)
            return true
        }
        return false
    }

    private calculateTargetToCamera(): Vector3 {
        return this.targetToCamera.subVectors(this.camera.position, this.target)
    }

    private get camera(): PerspectiveCamera {
        return <PerspectiveCamera>this.orbit.object
    }
}
