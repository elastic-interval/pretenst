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

interface ICylinderFace {
    cylinder: ICylinder
    middle: IJoint
    radials: IInterval[]
    ends: IJoint[]
}

interface ICylinder {
    alpha?: ICylinderFace
    omega?: ICylinderFace
    chirality: Chirality
    scale: IPercent
    pushes: IInterval[]
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
        const length = roleDefaultLength(IntervalRole.ColumnPush) * percentToFactor(scale)
        const points = baseFace ? faceCylinderPoints(baseFace, length) : firstCylinderPoints(length)
        const countdown = this.tensegrity.numericFeature(WorldFeature.IntervalCountdown)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        const ends = points.ends.map(({alpha, omega}) => ({
            alpha: this.tensegrity.createIJoint(alpha),
            omega: this.tensegrity.createIJoint(omega),
        }))
        const alphaMid = this.tensegrity.createIJoint(points.alphaMid)
        const omegaMid = this.tensegrity.createIJoint(points.omegaMid)
        this.tensegrity.instance.refreshFloatView()
        const cylinder = <ICylinder>{
            chirality,
            scale,
            pushes: [],
        }
        const createInterval = (alpha: IJoint, omega: IJoint, intervalRole: IntervalRole) =>
            this.tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, countdown)
        ends.forEach(({alpha, omega}) => {
            const push = createInterval(alpha, omega, IntervalRole.ColumnPush)
            cylinder.pushes.push(push)
            alpha.push = omega.push = push
        })
        cylinder.alpha = <ICylinderFace>{
            cylinder,
            middle: alphaMid,
            ends: ends.map(({alpha}) => alpha),
            radials: ends.map(({alpha}) => createInterval(alphaMid, alpha, IntervalRole.Radial)),
        }
        cylinder.omega = <ICylinderFace>{
            cylinder,
            middle: omegaMid,
            ends: ends.map(({omega}) => omega),
            radials: ends.map(({omega}) => createInterval(omegaMid, omega, IntervalRole.Radial)),
        }
        ends.forEach(({alpha}, index) => {
            const offset = cylinder.chirality === Chirality.Left ? ends.length - 1 : 1
            const omega = ends[(index + offset) % ends.length].omega
            createInterval(alpha, omega, IntervalRole.Triangle)
        })
        if (baseFace) {
            const baseEnds = baseFace.ends
            const bottomEnds = baseEnds.map(baseEnd => otherJoint(baseEnd))
            const alphaEnds = cylinder.alpha.ends
            const omegaEnds = cylinder.omega.ends
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
                const offset = baseFace.cylinder.chirality === Chirality.Left ? 1 : 0
                const bottomJoint = bottomEnds[(index + offset) % bottomEnds.length]
                createInterval(alphaEnd, bottomJoint, IntervalRole.Triangle)
            })
            // todo: remove baseFace from its cylinder
            baseFace.radials.forEach(radial => this.tensegrity.removeInterval(radial))
            cylinder.alpha.radials.forEach(radial => this.tensegrity.removeInterval(radial))
            cylinder.alpha = undefined
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

function firstCylinderPoints(length: number): IPoints {
    const base: Vector3[] = []
    for (let index = 0; index < CYL_SIZE; index++) {
        const angle = index * Math.PI * 2 / CYL_SIZE
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        base.push(new Vector3(x, 0, y))
    }
    return cylinderPoints(new Vector3(), base.reverse(), length)
}

function faceCylinderPoints(face: ICylinderFace, length: number): IPoints {
    const midpoint = face.middle.location()
    const base = face.ends.map(end => end.location())
    return cylinderPoints(midpoint, base, length)
}

function cylinderPoints(midpoint: Vector3, base: Vector3[], length: number): IPoints {
    const points: IPoint[] = []
    const alphaMid = new Vector3()
    const omegaMid = new Vector3()
    const initialLength = length * 0.5
    for (let index = 0; index < base.length; index++) {
        const a = new Vector3().subVectors(base[index], midpoint).normalize()
        const b = new Vector3().subVectors(base[(index + 1) % base.length], midpoint).normalize()
        const out = new Vector3().addVectors(a, b).normalize().multiplyScalar(initialLength * 0.1)
        const alpha = new Vector3().copy(midpoint).add(out)
        const up = new Vector3().crossVectors(a, b).normalize().multiplyScalar(initialLength)
        const omega = new Vector3().copy(midpoint).add(out).add(up)
        points.push({alpha, omega})
        alphaMid.add(alpha)
        omegaMid.add(omega)
    }
    alphaMid.multiplyScalar(1 / base.length)
    omegaMid.multiplyScalar(1 / base.length)
    return {alphaMid, omegaMid, ends: points}
}
