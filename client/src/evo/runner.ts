/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, Stage } from "eig"
import { Quaternion, Vector3 } from "three"

import { FORWARD } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { IFace, IInterval } from "../fabric/tensegrity-types"

import { fromGeneData, IGeneData } from "./genome"
import {
    calculateDirections,
    Direction,
    directionGene,
    DIRECTIONS,
    extractLoopMuscles,
    findTopFace,
    IMuscle,
    IRunnerState,
} from "./runner-logic"
import { Twitcher, TwitchFunction } from "./twitcher"

const CLOSE_ENOUGH_TO_TARGET = 4

export class Runner {

    public toA = new Vector3(1, 0, 0)
    public toB = new Vector3(0, 0, 1)
    public toC = new Vector3(0, 0, -1)

    private shapingTime = 150
    private twitcher?: Twitcher
    private topFace?: IFace
    private currentTwitchAge = 0

    constructor(public readonly state: IRunnerState, public embryo?: Tensegrity) {
        if (!embryo) {
            this.twitcher = new Twitcher(this.state)
        }
        this.currentTwitchAge = this.twitchAge
    }

    public get growing(): boolean {
        return !!this.embryo
    }

    public recycled(instance: FabricInstance, geneData?: IGeneData[]): Runner {
        const genome = fromGeneData(geneData ? geneData : this.state.patch.storedGenes[0])
        const midpoint = new Vector3().copy(this.state.midpoint)
        const state: IRunnerState = {...this.state, instance, midpoint, genome, directionHistory: []}
        const runner = new Runner(state)
        runner.topFace = this.topFace
        return runner
    }

    public getCycleCount(useTwitches: boolean): number {
        return !this.twitcher ? 0 : useTwitches ? Math.floor(this.twitcher.twitchCount / this.state.twitchesPerCycle) : this.twitcher.cycleCount
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

    public adoptFabric(fabric: Fabric): FabricInstance {
        return this.state.instance.adoptFabric(fabric)
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

    public get distanceFromTarget(): number {
        return this.state.midpoint.distanceTo(this.target)
    }

    public iterate(): boolean {
        const instance = this.state.instance
        const view = instance.view
        this.state.midpoint.set(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
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
                    this.topFace = findTopFace(embryo)
                    embryo.stage = Stage.Pretensing
                    return false
                case Stage.Pretensing:
                    embryo.stage = Stage.Pretenst
                    return false
                case Stage.Pretenst:
                    this.state.loopMuscles = extractLoopMuscles(embryo)
                    this.twitcher = new Twitcher(this.state)
                    this.embryo = undefined
                    return true
                default:
                    return false
            }
        } else {
            this.state.instance.iterate()
            if (this.twitcher) {
                const newTwitchAge = this.twitchAge
                if (newTwitchAge <= this.currentTwitchAge) {
                    return true
                }
                this.currentTwitchAge = newTwitchAge
                const twitch: TwitchFunction = (muscle: IMuscle, attack: number, decay: number, twitchNuance: number) => {
                    const twitchInterval = (interval?: IInterval) => {
                        if (interval) {
                            this.state.instance.fabric.twitch_interval(interval.index, attack, decay, twitchNuance)
                            // console.log(`twitch ${interval.index}: ${attack}, ${decay}, ${twitchNuance}`)
                        }
                    }
                    twitchInterval(muscle.alphaInterval)
                    twitchInterval(muscle.omegaInterval)
                }
                calculateDirections(this.state.instance, this.toA, this.toB, this.toC, this.topFace)
                if (this.state.autopilot && this.twitcher.tick(twitch)) {
                    if (this.reachedTarget) {
                        this.direction = Direction.Rest
                    } else {
                        this.checkDirection()
                    }
                }
            }
            return true
        }
    }

    public showFrozen(): void {
        this.state.instance.showFrozen(this.reachedTarget)
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
        return this.state.instance.jointLocation(joint)
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

    private get twitchAge(): number {
        return this.state.instance.fabric.age / 600
    }

    private quaternionForDirection(direction: Direction): Quaternion {
        const towards = () => {
            switch (direction) {
                case Direction.Rest:
                case Direction.ToA:
                    return this.toA
                case Direction.ToB:
                    return this.toB
                case Direction.ToC:
                    return this.toC
            }
        }
        return new Quaternion().setFromUnitVectors(FORWARD, towards())
    }

    private get directionToTarget(): Direction {
        const toTarget = this.toTarget
        const matchA = toTarget.dot(this.toA)
        const matchB = toTarget.dot(this.toB)
        const matchC = toTarget.dot(this.toC)
        if (matchA > matchB && matchA > matchC) {
            return Direction.ToA
        }
        if (matchB > matchA && matchB > matchC) {
            return Direction.ToB
        }
        if (matchC > matchA && matchC > matchB) {
            return Direction.ToC
        }
        console.error("direction to target: rest")
        return Direction.Rest
    }

    private get toTarget(): Vector3 {
        const toTarget = new Vector3()
        toTarget.subVectors(this.target, this.state.midpoint)
        toTarget.y = 0
        toTarget.normalize()
        return toTarget
    }
}

