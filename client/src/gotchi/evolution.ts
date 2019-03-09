import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {NORMAL_TICKS, SPOT_TO_HANGER} from "../body/fabric"
import {Direction} from "../body/fabric-exports"
import {fromGenomeData, Genome, IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import {Leg} from "../island/journey"

import {Evolver, IEvolver} from "./evolver"

export const INITIAL_JOINT_COUNT = 47
export const MAX_POPULATION = 24
const MUTATION_COUNT = 18
const MINIMUM_AGE = 15000
const MAXIMUM_AGE = 30000
const INCREASE_AGE_LIMIT = 1000
const SURVIVAL_RATE = 0.66

export class Evolution {
    public evolversNow: BehaviorSubject<Evolver[]> = new BehaviorSubject<Evolver[]>([])
    private rebooting = false
    private ageLimit = 30000 // MINIMUM_AGE
    private frozenHero?: Evolver
    private leg: Leg

    constructor(private hexalot: Hexalot, firstLeg: Leg, private saveGenome: (genome: IGenomeData) => void) {
        this.leg = firstLeg
        const evolvers = this.createPopulation(Direction.REVERSE) // todo: which direction?
        this.evolversNow.next(evolvers)
    }

    public get midpoint(): Vector3 {
        const evolvers = this.evolversNow.getValue()
        if (evolvers.length === 0) {
            return new Vector3().add(this.hexalot.center).add(SPOT_TO_HANGER)
        }
        const vectors = evolvers.map(evolver => evolver.vectors)
        const sumFromArray = (prev: Vector3, array: Float32Array) => {
            prev.x += array[0]
            prev.y += array[1]
            prev.z += array[2]
            return prev
        }
        return vectors.reduce(sumFromArray, new Vector3()).multiplyScalar(1 / evolvers.length)
    }

    public iterate(): void {
        const evolvers = this.evolversNow.getValue()
        if (evolvers.length === 0 || this.rebooting) {
            return
        }
        const heroEvolver = evolvers.find(e => e.touchedDestination)
        if (heroEvolver) {
            console.log("next generation from hero", heroEvolver)
            this.nextGenerationFromHero(heroEvolver)
            return
        }
        const moving = evolvers.filter(evolver => evolver.age < this.ageLimit)
        if (moving.length === 0) {
            console.log("no more movers", evolvers.length)
            if (!this.frozenHero) {
                this.saveStrongest()
            }
            this.adjustAgeLimit()
            this.nextGenerationFromSurvival()
            return
        }
        moving.forEach(evolver => {
            const behind = this.ageLimit - evolver.age
            const timeSweepTick = evolver.iterate(behind > NORMAL_TICKS ? NORMAL_TICKS : behind)
            if (timeSweepTick && !evolver.gestating) {
                evolver.mutateGenome(3)
                evolver.adjustDirection()
            }
        })
    }

    public recycle(): void {
        this.evolversNow.getValue().forEach(evolver => evolver.recycle())
    }

    // Privates =============================================================

    private saveStrongest(): void {
        const toSave = this.strongest
        if (toSave) {
            this.saveGenome(toSave.evolver.genomeData)
        } else {
            console.log("no strongest?")
        }
    }

    private adjustAgeLimit(): void {
        this.ageLimit += INCREASE_AGE_LIMIT
        const ageLimitForLeg = MAXIMUM_AGE * (this.leg.visited + 1)
        if (this.ageLimit >= ageLimitForLeg) {
            this.ageLimit = ageLimitForLeg + MINIMUM_AGE
        }
        console.log("age limit now", this.ageLimit)
    }

    private get rankedEvolvers(): IEvolver[] {
        let evolvers = this.evolversNow.getValue()
        const frozenHero = this.frozenHero
        if (frozenHero) {
            evolvers = evolvers.filter(e => e.index !== frozenHero.index)
        }
        const evaluated = evolvers.map(evolver => evolver.evaluated)
        return evaluated.sort((a: IEvolver, b: IEvolver) => a.distanceFromTarget - b.distanceFromTarget)
    }

    private get strongest(): IEvolver | undefined {
        return this.rankedEvolvers[0]
    }

    private nextGenerationFromHero(heroEvolver: Evolver): void {
        this.rebooting = true
        this.frozenHero = heroEvolver
        const nextLeg = this.leg.nextLeg
        if (!nextLeg) {
            console.warn("Evolution is over")
            return // todo: evolution is over
        }
        this.leg = heroEvolver.leg = nextLeg
        const evolvers = this.evolversNow.getValue()
        this.evolversNow.next([heroEvolver])
        setTimeout(() => {
            const otherEvolvers = evolvers.filter(evolver => evolver.index !== heroEvolver.index)
            otherEvolvers.forEach(evolver => evolver.recycle())
            this.evolversNow.next(this.createPopulation(heroEvolver.direction))
            this.rebooting = false
        }, 500)
    }

    private nextGenerationFromSurvival(): void {
        this.rebooting = true
        const ranked: IEvolver[] = this.rankedEvolvers
        const dead = ranked.splice(Math.ceil(ranked.length * SURVIVAL_RATE))
        dead.forEach(e => console.log(`Dead ${e.evolver.index}:  ${e.distanceFromTarget}`))
        ranked.forEach(e => console.log(`Ranked ${e.evolver.index}:  ${e.distanceFromTarget}`))
        this.evolversNow.next(ranked.map(e => e.evolver))
        dead.forEach(e => e.evolver.recycle())
        setTimeout(() => {
            const nextGeneration: Evolver[] = []
            dead.map(e => e.evolver).forEach(() => {
                const luckyParent = ranked[Math.floor(ranked.length * Math.random())].evolver
                const offspring = this.createOffspring(luckyParent)
                if (offspring) {
                    nextGeneration.push(offspring)
                }
            })
            this.evolversNow.next([])
            setTimeout(() => {
                ranked.forEach(e => e.evolver.recycle())
                ranked.map(e => e.evolver).forEach(evolver => {
                    const reborn = this.createEvolver(fromGenomeData(evolver.genomeData))
                    if (reborn) {
                        nextGeneration.push(reborn)
                    }
                })
                this.evolversNow.next(nextGeneration)
                this.rebooting = false
            }, 500)
        }, 500)
    }

    private createPopulation(directionToMutate: Direction): Evolver[] {
        let mutatingGenome: Genome | undefined = fromGenomeData(this.hexalot.genome.genomeData)
        const evolvers: Evolver[] = []
        while (true) {
            const evolver = this.createEvolver(mutatingGenome)
            if (!evolver) {
                break
            }
            evolvers.push(evolver)
            mutatingGenome = mutatingGenome.withMutatedBehavior(evolver.direction, MUTATION_COUNT)
        }
        return evolvers
    }

    private createOffspring(parent: Evolver): Evolver | undefined {
        const offspringGenome = fromGenomeData(parent.offspringGenome)
        return this.createEvolver(offspringGenome)
    }

    private createEvolver(genome: Genome): Evolver | undefined {
        const frozenHero = this.frozenHero
        const gotchi = frozenHero ? frozenHero.gotchiWithGenome(genome) : this.hexalot.createGotchi(genome)
        if (!gotchi) {
            return undefined
        }
        return new Evolver(gotchi, this.leg)
    }
}
