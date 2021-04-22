/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, View } from "eig"
import { Quaternion, Vector3 } from "three"

import { FORWARD } from "../fabric/eig-util"
import { FabricInstance } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"

import { fromGeneData, Genome, IGeneData, randomModifierName } from "./genome"
import { Patch } from "./patch"
import { Direction, directionGene, DIRECTIONS, IExtremity, IMuscle, IRunnerState, Limb } from "./runner-logic"
import { Twitch, Twitcher } from "./twitcher"

const CLOSE_ENOUGH_TO_TARGET = 4

export class Runner {
    // private shapingTime = 50
    private twitcher?: Twitcher

    constructor(public readonly state: IRunnerState, public embryo?: Tensegrity) {
        if (!embryo) {
            this.twitcher = new Twitcher(this.state)
        }
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

    public getExtremity(whichLimb: Limb): IExtremity {
        const extremity = this.state.extremities.find(({limb}) => limb === whichLimb)
        if (!extremity) {
            throw new Error("No extremity found")
        }
        return extremity
    }

    public mutatedGeneData(): IGeneData[] {
        const counts = DIRECTIONS.map(dir => {
            const count = this.state.directionHistory.filter(d => d === dir).length
            return ({dir, count})
        })
        const nonzero = counts.filter(count => count.count > 0)
        const geneNames = nonzero.map(d => d.dir).map(directionGene)
        const modifierName = Math.random() > 0.95 ? randomModifierName() : undefined
        return this.state.genome.withMutations(geneNames, modifierName).geneData
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
        if (this.embryo) {
            return true // todo
            // const nextStage = embryo.iterate()
            // const life = embryo.life$.getValue()
            // if (life.stage === Stage.Pretensing && nextStage === Stage.Pretenst) {
            //     embryo.transition = {stage: Stage.Pretenst}
            // } else if (nextStage !== undefined && nextStage !== life.stage && life.stage !== Stage.Pretensing) {
            //     embryo.transition = {stage: nextStage}
            // }
            // switch (nextStage) {
            //     case Stage.Shaping:
            //         if (this.shapingTime <= 0) {
            //             instance.fabric.adopt_lengths()
            //             // const faceIntervals = [...embryo.faceIntervals]
            //             // faceIntervals.forEach(interval => embryo.removeFaceInterval(interval))
            //             // instance.iterate(Stage.Slack)
            //             // instance.iterate(Stage.Pretensing)
            //         } else {
            //             this.shapingTime--
            //         }
            //         return false
            //     case Stage.Pretensing:
            //         return true
            //     case Stage.Pretenst:
            //         extractRunnerFaces(embryo, state.muscles, state.extremities)
            //         embryo.transition = {stage: Stage.Pretenst}
            //         embryo.iterate()
            //         this.embryo = undefined
            //         this.twitcher = new Twitcher(state)
            //         return true
            //     default:
            //         return false
            // }
        } else {
            // instance.iterate(Stage.Pretenst)
            if (this.twitcher) {
                const twitch: Twitch = (m, a, d, n) => this.twitch(m, a, d, n)
                if (this.twitcher.tick(twitch) && this.state.autopilot) {
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
        this.instance.showFrozen(this.reachedTarget)
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

    private twitch(muscle: IMuscle, attack: number, decay: number, intensity: number): void {
        this.state.instance.fabric.twitch_face(muscle.faceIndex, attack, decay, intensity)
        // console.log(`twitch ${muscle.name} ${muscle.faceIndex}: ${attack}, ${decay}`)
    }

    private quaternionForDirection(direction: Direction): Quaternion {
        const towards = () => {
            const instance = this.state.instance
            switch (direction) {
                case Direction.Rest:
                case Direction.Forward:
                    return instance.forward
                case Direction.Left:
                    return instance.left
                case Direction.Right:
                    return instance.right
            }
        }
        return new Quaternion().setFromUnitVectors(FORWARD, towards())
    }

    public get topJointLocation(): Vector3 {
        const topJoint = 3
        const loc = this.state.instance.floatView.jointLocations
        return new Vector3(loc[topJoint * 3], loc[topJoint * 3 + 1], loc[topJoint * 3 + 2])
    }

    private get directionToTarget(): Direction {
        const toTarget = this.toTarget
        const instance = this.state.instance
        instance.refreshFloatView()
        const degreeForward = toTarget.dot(instance.forward)
        const degreeRight = toTarget.dot(instance.right)
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

