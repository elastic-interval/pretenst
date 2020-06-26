/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { roleDefaultLength } from "../pretenst"

import { Tensegrity } from "./tensegrity"
import { scaleToInitialStiffness } from "./tensegrity-optimizer"
import { IInterval, IJoint, IPercent, otherJoint, percentToFactor } from "./tensegrity-types"

export enum Chirality {Left, Right}

function oppositeChirality(chirality: Chirality): Chirality {
    switch (chirality) {
        case Chirality.Left:
            return Chirality.Right
        case Chirality.Right:
            return Chirality.Left
    }
}

interface IFace {
    chirality: Chirality
    pulls: IInterval[]
    ends: IJoint[]
    removed: boolean
}

function faceMidpoint(face: IFace): Vector3 {
    const midpoint = new Vector3()
    face.ends.forEach(end => midpoint.add(end.location()))
    return midpoint.multiplyScalar(1 / face.ends.length)
}

interface ICylinder {
    faces: IFace[]
    scale: IPercent
    pushes: IInterval[]
}

// interface ISphere {
//     faces: IFace[]
//     scale: IPercent
//     pushes: IInterval[]
// }

const CYL_SIZE = 3

export class TensegrityBuilder {

    constructor(private tensegrity: Tensegrity) {
    }

    public createCylinderAt(midpoint: Vector3, chirality: Chirality, scale: IPercent): ICylinder {
        return this.createCylinder(chirality, scale)
    }

    public createConnectedCylinder(face: IFace, scale: IPercent): ICylinder {
        const chirality = oppositeChirality(face.chirality)
        return this.createCylinder(chirality, scale, face)
    }

    private createCylinder(chirality: Chirality, scale: IPercent, baseFace?: IFace): ICylinder {
        const points = baseFace ? faceCylinderPoints(baseFace, scale) : firstCylinderPoints(scale)
        const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        const ends = points.ends.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createIJoint(alpha),
            omega: this.tensegrity.createIJoint(omega),
        }))
        this.tensegrity.instance.refreshFloatView()
        const createInterval = (alpha: IJoint, omega: IJoint, intervalRole: IntervalRole) =>
            this.tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, countdown)
        const cylinder: ICylinder = {
            scale, pushes: [],
            faces: [
                {
                    chirality,
                    ends: ends.map(({alpha}) => alpha),
                    pulls: ends.map(({alpha}, index) =>
                        createInterval(alpha, ends[(index + 1) % ends.length].alpha, IntervalRole.Triangle)),
                    removed: false,
                },
                {
                    chirality,
                    ends: ends.map(({omega}) => omega),
                    pulls: ends.map(({omega}, index) =>
                        createInterval(omega, ends[(index + 1) % ends.length].omega, IntervalRole.Triangle)),
                    removed: false,
                },
            ],
        }
        ends.forEach(({alpha, omega}) => {
            const push = createInterval(alpha, omega, IntervalRole.ColumnPush)
            cylinder.pushes.push(push)
            alpha.push = omega.push = push
        })
        ends.forEach(({alpha}, index) => {
            const offset = cylinder.faces[0].chirality === Chirality.Left ? ends.length - 1 : 1
            const omega = ends[(index + offset) % ends.length].omega
            createInterval(alpha, omega, IntervalRole.Triangle)
        })
        if (baseFace) {
            const baseEnds = baseFace.ends
            const bottomEnds = baseEnds.map(baseEnd => otherJoint(baseEnd))
            const alphaEnds = cylinder.faces[0].ends
            const omegaEnds = cylinder.faces[1].ends
            alphaEnds.forEach((alphaEnd, index) => { // ring
                const nextIndex = (index + 1) % baseEnds.length
                createInterval(alphaEnd, baseEnds[index], IntervalRole.Ring)
                createInterval(alphaEnd, baseEnds[nextIndex], IntervalRole.Ring)
            })
            omegaEnds.forEach((omegaEnd, index) => { // up
                const offset = chirality === Chirality.Left ? 1 : 0
                const baseEnd = baseEnds[(index + offset) % omegaEnds.length]
                createInterval(omegaEnd, baseEnd, IntervalRole.Triangle)
            })
            alphaEnds.forEach((alphaEnd, index) => { // down
                const offset = baseFace.chirality === Chirality.Left ? 1 : 0
                const bottomJoint = bottomEnds[(index + offset) % bottomEnds.length]
                createInterval(alphaEnd, bottomJoint, IntervalRole.Triangle)
            })
            baseFace.pulls.forEach(pull => this.tensegrity.removeInterval(pull))
            baseFace.removed = true
            cylinder.faces[0].pulls.forEach(pull => this.tensegrity.removeInterval(pull))
            cylinder.faces[0].removed = true
        }
        return cylinder
    }
}

interface IPoint {
    alpha: Vector3
    omega: Vector3
}

interface IPoints {
    alphaMid: Vector3
    omegaMid: Vector3
    ends: IPoint[]
}

function firstCylinderPoints(scale: IPercent): IPoints {
    const base: Vector3[] = []
    for (let index = 0; index < CYL_SIZE; index++) {
        const angle = index * Math.PI * 2 / CYL_SIZE
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        base.push(new Vector3(x, 0, y))
    }
    return cylinderPoints(new Vector3(), base.reverse(), scale, false)
}

function faceCylinderPoints(face: IFace, scale: IPercent): IPoints {
    const midpoint = faceMidpoint(face)
    const base = face.ends.map(end => end.location())
    return cylinderPoints(midpoint, base, scale, true)
}

function cylinderPoints(midpoint: Vector3, base: Vector3[], scale: IPercent, apex: boolean): IPoints {
    const scaleFactor = percentToFactor(scale)
    const pushLength = scaleFactor * roleDefaultLength(IntervalRole.ColumnPush)
    const initialLength = pushLength * 0.25
    const radialLength = scaleFactor / Math.sqrt(3)
    const points: IPoint[] = []
    const alphaMid = new Vector3()
    const omegaMid = new Vector3()
    const sub = (a: Vector3, b: Vector3) => new Vector3().subVectors(a, b).normalize()
    const mid = () => new Vector3().copy(midpoint)
    for (let index = 0; index < base.length; index++) {
        const a = sub(base[index], midpoint)
        const b = sub(base[(index + 1) % base.length], midpoint)
        const ab = new Vector3().addVectors(a, b).normalize()
        const up = new Vector3().crossVectors(a, b).normalize().multiplyScalar(initialLength)
        const alpha = mid()
        const omega = mid().add(up)
        const tinyRadius = 0.2 * initialLength
        omega.addScaledVector(ab, tinyRadius)
        alpha.addScaledVector(ab, apex ? radialLength / 2 : tinyRadius)
        points.push({alpha, omega})
        alphaMid.add(alpha)
        omegaMid.add(omega)
    }
    alphaMid.multiplyScalar(1 / base.length)
    omegaMid.multiplyScalar(1 / base.length)
    return {alphaMid, omegaMid, ends: points}
}
