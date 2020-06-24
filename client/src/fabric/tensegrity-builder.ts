/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { Tensegrity } from "./tensegrity"
import { scaleToInitialStiffness } from "./tensegrity-optimizer"
import { IInterval, IJoint, IPercent, otherJoint } from "./tensegrity-types"

enum Chirality {Left, Right}

function oppositeChirality(chirality: Chirality): Chirality {
    switch (chirality) {
        case Chirality.Left:
            return Chirality.Right
        case Chirality.Right:
            return Chirality.Left
    }
}

interface ICylinderFace {
    cylinder: ICylinder
    middle: IJoint
    pulls: IInterval[]
}

interface ICylinder {
    alpha?: ICylinderFace
    omega?: ICylinderFace
    chirality: Chirality
    scale: IPercent
    joints: IJoint[]
    pushes: IInterval[]
    pulls: IInterval[]
}

const CYL_SIZE = 3

export class TensegrityBuilder {

    constructor(private tensegrity: Tensegrity) {
    }

    public createCylinderAt(midpoint: Vector3, chirality: Chirality, scale: IPercent): ICylinder {
        return this.createCylinder(chirality, scale)
    }

    public createConnectedCylinder(face: ICylinderFace, scale: IPercent): ICylinder {
        const chirality = oppositeChirality(face.cylinder.chirality)
        return this.createCylinder(chirality, scale, face)
    }

    private createCylinder(chirality: Chirality, scale: IPercent, baseFace?: ICylinderFace): ICylinder {
        const points = baseFace ? faceCylinderPoints(baseFace) : firstCylinderPoints()
        const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        const createInterval = (alpha: IJoint, omega: IJoint, intervalRole: IntervalRole) =>
            this.tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, countdown)
        const joints = points.map(p => this.tensegrity.createIJoint(p))
        const cylinder = <ICylinder>{chirality, scale, joints, pulls: [], pushes: []}
        this.tensegrity.instance.refreshFloatView()
        const midAlpha = new Vector3()
        const midOmega = new Vector3()
        for (let index = 0; index < CYL_SIZE; index++) {
            const alpha = joints[index * 2]
            const omega = joints[index * 2 + 1]
            midAlpha.add(alpha.location())
            midOmega.add(omega.location())
            const push = createInterval(alpha, omega, IntervalRole.ColumnPush)
            cylinder.pushes.push(push)
            alpha.push = omega.push = push
        }
        const alphaJoint = this.tensegrity.createIJoint(midAlpha.multiplyScalar(1 / CYL_SIZE))
        const omegaJoint = this.tensegrity.createIJoint(midOmega.multiplyScalar(1 / CYL_SIZE))
        const alphaFace = cylinder.alpha = <ICylinderFace>{cylinder, middle: alphaJoint, pulls: []}
        const omegaFace = cylinder.omega = <ICylinderFace>{cylinder, middle: omegaJoint, pulls: []}
        cylinder.pushes.forEach(push =>
            alphaFace.pulls.push(createInterval(alphaJoint, push.alpha, IntervalRole.Radial)))
        cylinder.pushes.forEach(push =>
            omegaFace.pulls.push(createInterval(omegaJoint, push.omega, IntervalRole.Radial)))
        for (let index = 0; index < CYL_SIZE; index++) {
            const alphaIndex = index * 2 + (chirality === Chirality.Right ? 0 : 1)
            const omegaIndex = index * 2 + (chirality === Chirality.Left ? 0 : 1)
            cylinder.pulls.push(createInterval(joints[alphaIndex], joints[omegaIndex], IntervalRole.Triangle))
        }
        if (baseFace) {
            const baseJoints = baseFace.pulls.map(pull => otherJoint(baseFace.middle, pull))
            const otherJoints = baseJoints.map(baseJoint => otherJoint(baseJoint, baseJoint.push))
            const alphaJoints = cylinder.pushes.map(p => p.alpha)
            for (let index = 0; index < CYL_SIZE; index++) {
                const otherIndex = (index + (chirality === Chirality.Left ? 0 : 1)) % CYL_SIZE
                cylinder.pulls.push(createInterval(alphaJoints[index], otherJoints[otherIndex], IntervalRole.Triangle))
            }
            // todo: remove baseFace from its cylinder
            cylinder.alpha = undefined
        }
        return cylinder
    }
}

function firstCylinderPoints(): Vector3[] {
    const base: Vector3[] = []
    for (let index = 0; index < CYL_SIZE; index++) {
        const angle = index * Math.PI * 2 / CYL_SIZE
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        base.push(new Vector3(x, 0, y))
    }
    return cylinderPoints(new Vector3(), base)
}

function faceCylinderPoints(face: ICylinderFace): Vector3[] {
    const midpoint = face.middle.location()
    const base = face.pulls.map(pull => otherJoint(face.middle, pull).location())
    return cylinderPoints(midpoint, base)
}

function cylinderPoints(midpoint: Vector3, base: Vector3[]): Vector3[] {
    const points: Vector3[] = []
    const tiny = 0.03
    for (let index = 0; index < base.length; index++) {
        const a = new Vector3().subVectors(base[index], midpoint).normalize()
        const b = new Vector3().subVectors(base[(index + 1) % base.length], midpoint).normalize()
        const up = new Vector3().crossVectors(a, b).normalize().multiplyScalar(tiny)
        const out = new Vector3().addVectors(a, b).normalize().multiplyScalar(tiny)
        points.push(new Vector3().copy(midpoint).add(out).sub(up))
        points.push(new Vector3().copy(midpoint).add(out).add(up))
    }
    return points
}
