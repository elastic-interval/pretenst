/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { GeneReader } from "./genome"
import { Gotchi, Limb } from "./gotchi"


export class TimeCycle {
    private slices: Record<number, ISlice> = {}

    constructor(geneReader: GeneReader, faceCount: number, graspCount: number, twitchCount: number) {
        while (graspCount-- > 0) {
            const grasp = geneReader.readGrasp()
            this.addGrasp(grasp.when, grasp)
        }
        while (twitchCount-- > 0) {
            const twitch = geneReader.readMuscleTwitch(faceCount)
            this.addTwitch(twitch.when, twitch)
        }
    }

    public activate(timeSlice: number, gotchi: Gotchi): void {
        const slice = this.slices[timeSlice]
        if (!slice) {
            return
        }
        slice.grasps.forEach(({whichLimbs, howLong}) => {
            whichLimbs.forEach(limb => {
                const whichFace = gotchi.getActuator(limb).index
                console.log(`grasp ${whichFace}: ${howLong}`)
                gotchi.fabric.grasp_face(whichFace, howLong)
            })
        })
        slice.twitches.forEach(({whichFace, attack, decay}) => {
            console.log(`twitch ${whichFace}: ${attack}, ${decay}`)
            gotchi.fabric.twitch_face(whichFace, 0.4, attack, decay)
        })
    }

    private addGrasp(index: number, grasp: IGrasp): void {
        const slice = this.slices[index]
        if (slice) {
            slice.grasps.push(grasp)
        } else {
            this.slices[index] = {grasps: [grasp], twitches: []}
        }
    }

    private addTwitch(index: number, twitch: ITwitch): void {
        const slice = this.slices[index]
        if (slice) {
            slice.twitches.push(twitch)
        } else {
            this.slices[index] = {grasps: [], twitches: [twitch]}
        }
    }
}

export interface ITwitch {
    when: number,
    whichFace: number,
    attack: number,
    decay: number,
}

export interface IGrasp {
    when: number
    whichLimbs: Limb[],
    howLong: number,
}

interface ISlice {
    grasps: IGrasp[]
    twitches: ITwitch[]
}
