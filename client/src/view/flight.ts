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

const ANGLE_ABOVE_HORIZON = Math.PI * 5 / 12

const TOWARDS_UPWARDS = 0.3
const TOWARDS_TARGET = 0.05
const TOWARDS_HEIGHT = 0.06
const TOWARDS_DISTANCE = 0.025

export class Flight {
    private target = new Vector3()
    private targetToCamera = new Vector3()
    private targetToMovingTarget = new Vector3()
    private lastChanged = Date.now()

    constructor(private orbit: OrbitControls) {
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

    public update(appState: IAppState): void {
        const flightTarget = appState.flightTarget
        this.moveTowardsTarget(flightTarget.location)
        if (appState.appMode === AppMode.Flying) {
            const distanceChanged = this.cameraFollowDistance(flightTarget)
            const heightChanged = this.cameraFollowHeight(flightTarget)
            if (!(distanceChanged || heightChanged)) {
                this.orbit.enabled = true
                console.log("REACHED flight target", flightTarget)
                appState.updateState(new Transition(appState).reachedFlightTarget(flightTarget).appState)
            } else {
                console.log(`Following height:${heightChanged}, distance:${distanceChanged}`)
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

    // const TOWARDS_ABOVE = 0.001
    // private moveTowardsAbove(): void {
    //     const polarAngle = this.orbit.getPolarAngle()
    //     const minPolarAngle = this.orbit.minPolarAngle
    //     if (polarAngle > minPolarAngle * 2) {
    //         this.orbit.rotateUp(TOWARDS_ABOVE * polarAngle / minPolarAngle)
    //     }
    // }

    private moveTowardsTarget(movingTarget: Vector3): void {
        this.target.add(this.targetToMovingTarget.subVectors(movingTarget, this.target).multiplyScalar(TOWARDS_TARGET))
    }

    private cameraFollowDistance(target: IFlightTarget): boolean {
        const currentDistance = this.calculateTargetToCamera().length()
        if (currentDistance > target.tooClose && currentDistance < target.tooFar) {
            return false
        }
        console.log(`${target.tooClose} < ${currentDistance} < ${target.tooFar}`)
        const nextDistance = currentDistance * (1 - TOWARDS_DISTANCE) + target.distance * TOWARDS_DISTANCE
        this.targetToCamera.normalize().multiplyScalar(nextDistance)
        this.camera.position.addVectors(this.target, this.targetToCamera)
        return true
    }

    private cameraFollowHeight(target: IFlightTarget): boolean {
        const currentHeight = this.camera.position.y
        if (currentHeight> target.tooLow && currentHeight < target.tooHigh) {
            return false
        }
        console.log(`${target.tooLow} < ${currentHeight} < ${target.tooHigh}`)
        this.camera.position.y = currentHeight * (1 - TOWARDS_HEIGHT) + target.height * TOWARDS_HEIGHT
        return true
    }

    private calculateTargetToCamera(): Vector3 {
        return this.targetToCamera.subVectors(this.camera.position, this.target)
    }

    private get camera(): PerspectiveCamera {
        return <PerspectiveCamera>this.orbit.object
    }
}
