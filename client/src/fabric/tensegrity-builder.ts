/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { roleDefaultLength } from "../pretenst"

import { Tensegrity } from "./tensegrity"
import { scaleToInitialStiffness } from "./tensegrity-optimizer"
import { IInterval, IJoint, IPercent, percentToFactor } from "./tensegrity-types"

enum Chirality {Left, Right}

function oppositeChirality(chirality: Chirality): Chirality {
    switch (chirality) {
        case Chirality.Left:
            return Chirality.Right
        case Chirality.Right:
            return Chirality.Left
    }
}

const PULL_ARRAY: { alphaIndex: number, omegaIndex: number, intervalRole: IntervalRole }[] = [
    {alphaIndex: 0, omegaIndex: 1, intervalRole: IntervalRole.Triangle},
]

interface ICylinderFace {
    cylinder: ICylinder
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

function cylinderPoints(length: number): Vector3[] {
    const points: Vector3[] = []
    for (let index = 0; index < CYL_SIZE; index++) {
        points.push(new Vector3(0, 0, 0))
        points.push(new Vector3(0, length, 0))
    }
    return points
}

export class TensegrityBuilder {

    constructor(private tensegrity: Tensegrity) {
    }

    public createCylinderAt(midpoint: Vector3, chirality: Chirality, scale: IPercent): ICylinder {
        const length = roleDefaultLength(IntervalRole.ColumnPush) * percentToFactor(scale)
        return this.createCylinder(cylinderPoints(length), chirality, scale)
    }

    public createConnectedCylinder(face: ICylinderFace, scale: IPercent): ICylinder {
        const chirality = oppositeChirality(face.cylinder.chirality)
        const length = roleDefaultLength(IntervalRole.ColumnPush) * percentToFactor(scale)
        return this.createCylinder(cylinderPoints(length), chirality, scale)
    }

    private createCylinder(points: Vector3[], chirality: Chirality, scale: IPercent, parent?: ICylinderFace): ICylinder {
        const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        const joints = points.map((p, idx) => this.tensegrity.createIJoint(p))
        const cylinder = <ICylinder>{chirality, scale, joints, pulls: [], pushes: []}
        cylinder.alpha = <ICylinderFace>{cylinder}
        cylinder.omega = <ICylinderFace>{cylinder}
        for (let index = 0; index < CYL_SIZE; index++) {
            const alpha = cylinder.joints[index * 2]
            const omega = cylinder.joints[index * 2 + 1]
            const push = this.tensegrity.createInterval(alpha, omega, IntervalRole.ColumnPush, scale, stiffness, linearDensity, countdown)
            cylinder.pushes.push(push)
            alpha.push = omega.push = push
        }
        PULL_ARRAY.forEach(({alphaIndex, omegaIndex, intervalRole}) => {
            const alpha = cylinder.joints[alphaIndex]
            const omega = cylinder.joints[omegaIndex]
            const pull = this.tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, countdown)
            cylinder.pulls.push(pull)
        })
        return cylinder
    }
}
