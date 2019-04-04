/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { PerspectiveCamera, Vector3 } from "three"
import { OrbitControls } from "three-orbitcontrols-ts"

import { IAppState } from "../state/app-state"
import { Transition } from "../state/transition"

export const INITIAL_DISTANCE = 15000
export const MINIMUM_DISTANCE = 7
export const ANGLE_ABOVE_HORIZON = Math.PI / 12

const CLOSE_ENOUGH = 60

const UPWARDS = 0.3
const TOWARDS_TARGET = 0.05
const DOLLY_SCALE_FACTOR = 0.005

export enum FlightMode {
    Arriving = "Arriving",
    Circling = "Circling",
    Approaching = "Approaching",
    Retreating = "Retreating",
    Tracking = "Tracking",
    Piloted = "Piloted",
}

export class Flight {
    private vector = new Vector3()
    private target = new Vector3()
    private lastChanged = Date.now()

    constructor(private orbit: OrbitControls, target: Vector3) {
        orbit.enabled = false
        orbit.minPolarAngle = Math.PI * 0.1
        orbit.maxPolarAngle = 0.95 * Math.PI / 2
        orbit.maxDistance = INITIAL_DISTANCE
        orbit.minDistance = MINIMUM_DISTANCE
        orbit.enableKeys = false
        orbit.zoomSpeed = 0.25
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
        const distance = this.distance
        if (distance < CLOSE_ENOUGH) {
            const up = this.camera.up
            up.y += UPWARDS
            up.normalize()
        }
        switch (appState.flightMode) {
            case FlightMode.Arriving:
                if (distance < CLOSE_ENOUGH) {
                    this.orbit.enabled = true
                    appState.updateState(new Transition(appState).withFlightMode(FlightMode.Piloted).appState)
                    break
                }
                const dollyScale = 1 + DOLLY_SCALE_FACTOR * distance / CLOSE_ENOUGH
                this.orbit.dollyIn(dollyScale)
                break
            case FlightMode.Tracking:
                const previousDistance = this.vector.subVectors(this.camera.position, this.target).length()
                const newDistance = this.vector.subVectors(this.camera.position, this.target).length()
                if (newDistance > previousDistance) {
                    this.camera.position
                        .set(0, 0, 0)
                        .add(this.target)
                        .addScaledVector(this.vector, previousDistance / newDistance)
                }
                break
            case FlightMode.Piloted:
                break
        }
        if (target) {
            // console.log("updating with target", target)
            this.vector.subVectors(target, this.target).multiplyScalar(TOWARDS_TARGET)
            this.target.add(this.vector)
        }
        this.orbit.update()
    }

    private get distance(): number {
        return this.camera.position.distanceTo(this.target)
    }

    private get camera(): PerspectiveCamera {
        return <PerspectiveCamera>this.orbit.object
    }
}
