/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage, View } from "eig"
import { Quaternion, Vector3 } from "three"

import { FORWARD } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, IJoint, jointLocation } from "../fabric/tensegrity-types"

import { fromGeneData, Genome, IGeneData } from "./genome"
import { Patch } from "./patch"
import { Direction, directionGene, DIRECTIONS, IRunnerState } from "./runner-logic"
import { Twitcher } from "./twitcher"

const CLOSE_ENOUGH_TO_TARGET = 4

export class Runner {

    public forward = new Vector3(1, 0, 0)
    public right = new Vector3(0, 0, 1)
    public left = new Vector3(0, 0, -1)

    private shapingTime = 200
    private twitcher?: Twitcher
    private topFace?: IFace

    constructor(public readonly state: IRunnerState, public embryo?: Tensegrity) {
    }

    public directionz(): void {
        const face = this.topFace
        if (!face) {
            return
        }
        const joint = face.joint
        if (!joint) {
            return undefined
        }
        const locations = this.state.instance.floatView.jointLocations
        const fromTo = (fromJoint: IJoint, toJoint: IJoint, vector: Vector3) => {
            const from = fromJoint.index * 3
            const to = toJoint.index * 3
            vector.set(locations[to] - locations[from], 0, locations[to + 2] - locations[from + 2])
            vector.normalize()
        }
        fromTo(joint, face.ends[0], this.forward)
        fromTo(joint, face.ends[1], this.left)
        fromTo(joint, face.ends[2], this.right)
    }

    public get twitcherString(): string {
        return this.twitcher ? this.twitcher.toString() : "no twitcher"
    }

    public get growing(): boolean {
        return !!this.embryo
    }

    public snapshot(): void {
        this.state.instance.snapshot()
    }

    public get genome(): Genome {
        return this.state.genome
    }

    public set genome(genome: Genome) {
        this.state.genome = genome
    }

    public recycled(instance: FabricInstance, geneData?: IGeneData[]): Runner {
        const genome = fromGeneData(geneData ? geneData : this.patch.storedGenes[0])
        const state: IRunnerState = {...this.state, instance, genome, directionHistory: []}
        return new Runner(state)
    }

    public getCycleCount(useTwitches: boolean): number {
        return !this.twitcher ? 0 : useTwitches ? Math.floor(this.twitcher.twitchCount / this.state.twitchesPerCycle) : this.twitcher.cycleCount
    }

    public get patch(): Patch {
        return this.state.patch
    }

    public get instance(): FabricInstance {
        return this.state.instance
    }

    public get autopilot(): boolean {
        return this.state.autopilot
    }

    public set autopilot(auto: boolean) {
        this.state.autopilot = auto
        if (auto) {
            this.checkDirection()
        }
    }

    public get direction(): Direction {
        return this.state.direction
    }

    public set direction(direction: Direction) {
        this.state.direction = direction
        this.autopilot = false
    }

    public get fabricClone(): Fabric {
        return this.state.instance.fabricClone
    }

    public adoptFabric(fabric: Fabric): FabricInstance {
        return this.state.instance.adoptFabric(fabric)
    }

    public get view(): View {
        return this.state.instance.view
    }

    public mutatedGeneData(): IGeneData[] {
        const counts = DIRECTIONS.map(dir => {
            const count = this.state.directionHistory.filter(d => d === dir).length
            return ({dir, count})
        })
        const nonzero = counts.filter(count => count.count > 0)
        const geneNames = nonzero.map(d => d.dir).map(directionGene)
        return this.state.genome.withMutations(geneNames, Math.random() > 0.9).geneData
    }

    public get age(): number {
        return this.state.instance.fabric.age
    }

    public getMidpoint(midpoint?: Vector3): Vector3 {
        if (!midpoint) {
            midpoint = new Vector3()
        }
        const view = this.state.instance.view
        midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        return midpoint
    }

    public get distanceFromTarget(): number {
        return this.getMidpoint().distanceTo(this.target)
    }

    public iterate(midpoint?: Vector3): boolean {
        const instance = this.state.instance
        const view = instance.view
        if (midpoint) {
            midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        }
        const embryo = this.embryo
        if (embryo) {
            const busy = embryo.iterate()
            if (busy) {
                return true
            }
            const stage = embryo.stage$.getValue()
            switch (stage) {
                case Stage.Shaping:
                    if (this.shapingTime <= 0) {
                        embryo.stage = Stage.Slack
                    } else {
                        this.shapingTime--
                    }
                    return false
                case Stage.Slack:
                    embryo.stage = Stage.Pretensing
                    return false
                case Stage.Pretensing:
                    embryo.stage = Stage.Pretenst
                    return false
                case Stage.Pretenst:
                    if (this.embryo) {
                        this.setTopFace()
                        const topFace = this.topFace
                        if (topFace) {
                            this.twitcher = new Twitcher(this.state)
                        }
                    }
                    this.embryo = undefined
                    return true
                default:
                    return false
            }
        } else {
            if (this.twitcher) {
                // const twitch: TwitchFunction = (muscle: IMuscle, attack: number, decay: number, intensity: number) => {
                //     this.state.instance.fabric.twitch_interval(muscle.intervalIndex, attack, decay, intensity)
                //     // console.log(`twitch ${muscle.name} ${muscle.faceIndex}: ${attack}, ${decay}`)
                // }
                // if (this.twitcher.tick(twitch) && this.state.autopilot) {
                //     if (this.reachedTarget) {
                //         this.direction = Direction.Rest
                //     } else {
                //         this.checkDirection()
                //     }
                // }
            }
            return true
        }
    }

    public showFrozen(): void {
        this.instance.showFrozen(this.reachedTarget)
    }

    public get topFaceLocation(): Vector3 | undefined {
        const face = this.topFace
        if (!face) {
            return undefined
        }
        const joint = face.joint
        if (!joint) {
            return undefined
        }
        return jointLocation(joint)
    }

    public get target(): Vector3 {
        return this.state.targetPatch.center
    }

    public get showDirection(): boolean {
        return this.state.direction !== Direction.Rest
    }

    public get directionQuaternion(): Quaternion {
        return this.quaternionForDirection(this.state.direction)
    }

    public get reachedTarget(): boolean {
        return this.distanceFromTarget < CLOSE_ENOUGH_TO_TARGET
    }

    public checkDirection(): void {
        const state = this.state
        if (this.reachedTarget) {
            this.direction = Direction.Rest
        } else {
            state.direction = this.directionToTarget
            state.directionHistory.push(state.direction)
        }
    }

    private setTopFace(): void {
        if (!this.embryo) {
            throw new Error("no embryo")
        }
        const topFace = this.embryo.faces.sort((a, b) => {
            const aa = a.joint
            const bb = b.joint
            if (!aa || !bb) {
                throw new Error("faces without joints")
            }
            const locA = jointLocation(aa)
            const locB = jointLocation(bb)
            return locA.y - locB.y
        }).pop()
        if (!topFace) {
            throw new Error("no top face")
        }
        this.topFace = topFace
    }

    private quaternionForDirection(direction: Direction): Quaternion {
        const towards = () => {
            switch (direction) {
                case Direction.Rest:
                case Direction.Forward:
                    return this.forward
                case Direction.Left:
                    return this.left
                case Direction.Right:
                    return this.right
            }
        }
        return new Quaternion().setFromUnitVectors(FORWARD, towards())
    }

    private get directionToTarget(): Direction {
        const toTarget = this.toTarget
        const instance = this.state.instance
        instance.refreshFloatView()
        const degreeForward = toTarget.dot(this.forward)
        const degreeRight = toTarget.dot(this.right)
        if (degreeRight > 0) {
            return degreeForward > degreeRight ? Direction.Forward : Direction.Right
        } else {
            return degreeForward > -degreeRight ? Direction.Forward : Direction.Left
        }
    }

    private get toTarget(): Vector3 {
        const toTarget = new Vector3()
        const view = this.state.instance.view
        const midpoint = new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
        toTarget.subVectors(this.target, midpoint)
        toTarget.y = 0
        toTarget.normalize()
        return toTarget
    }
}

