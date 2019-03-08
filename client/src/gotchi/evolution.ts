import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {NORMAL_TICKS, SPOT_TO_HANGER} from "../body/fabric"
import {Direction} from "../body/fabric-exports"
import {fromGenomeData, Genome, IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import {Leg} from "../island/journey"

import {compareEvolvers, Evolver} from "./evolver"
import {Gotchi} from "./gotchi"

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
    private ageLimit = MINIMUM_AGE
    private frozenHero?: Gotchi
    private leg: Leg

    constructor(private hexalot: Hexalot, firstLeg: Leg, private saveGenome: (genome: IGenomeData) => void) {
        this.leg = firstLeg
        const gotchiFromHexalot = (genome: Genome) => this.hexalot.createGotchi(genome)
        const evolvers = this.createEvolvers(gotchiFromHexalot)
        this.evolversNow.next(evolvers)
    }

    public get midpoint(): Vector3 {
        const evolvers = this.evolversNow.getValue()
        if (evolvers.length === 0) {
            return new Vector3().add(this.hexalot.center).add(SPOT_TO_HANGER)
        }
        return evolvers
            .map(evolver => evolver.gotchi.fabric.vectors)
            .reduce((prev, array) => {
                prev.x += array[0]
                prev.y += array[1]
                prev.z += array[2]
                return prev
            }, new Vector3())
            .multiplyScalar(1 / evolvers.length)
    }

    public iterate(): void {
        const evolvers = this.evolversNow.getValue()
        if (evolvers.length === 0 || this.rebooting) {
            return
        }
        const heroEvolver = evolvers.find(e => e.touchedDestination)
        if (heroEvolver) {
            this.nextGenerationFromHero(heroEvolver)
            return
        }
        const moving = evolvers.filter(evolver => evolver.gotchi.age < this.ageLimit)
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
            const behind = this.ageLimit - evolver.gotchi.age
            evolver.gotchi.iterate(behind > NORMAL_TICKS ? NORMAL_TICKS : behind)
            const gotchiDirection = evolver.gotchi.direction
            const chosenDirection = evolver.voteDirection()
            if (chosenDirection !== undefined && gotchiDirection !== chosenDirection) {
                evolver.gotchi.direction = chosenDirection
            }
        })
    }

    public recycle(): void {
        this.evolversNow.getValue().forEach(evolver => evolver.gotchi.recycle())
    }

    // Privates =============================================================

    private saveStrongest(): void {
        const toSave = this.strongest
        if (toSave) {
            this.saveGenome(toSave.gotchi.genomeData)
        } else {
            console.log("no strongest?")
        }
    }

    private adjustAgeLimit(): void {
        this.ageLimit += INCREASE_AGE_LIMIT
        if (this.ageLimit >= MAXIMUM_AGE * (this.leg.visited + 1)) {
            this.ageLimit = MAXIMUM_AGE * this.leg.visited + MINIMUM_AGE
        }
        console.log("age limit now", this.ageLimit)
    }

    private get rankedEvolvers(): Evolver[] {
        let evolvers = this.evolversNow.getValue()
        const frozenHero = this.frozenHero
        if (frozenHero) {
            evolvers = evolvers.filter(e => e.index !== frozenHero.index)
        }
        evolvers.forEach(e => e.calculateFitness())
        return evolvers.sort(compareEvolvers)
    }

    private get strongest(): Evolver | undefined {
        return this.rankedEvolvers[0]
    }

    private nextGenerationFromHero(heroEvolver: Evolver): void {
        this.rebooting = true
        const nextLeg = this.leg.nextLeg
        if (!nextLeg) {
            console.warn("Evolution is over")
            return // todo: evolution is over
        }
        this.leg = heroEvolver.leg = nextLeg
        const heroGotchi = heroEvolver.gotchi
        this.frozenHero = heroGotchi
        const evolvers = this.evolversNow.getValue()
        this.evolversNow.next([heroEvolver])
        setTimeout(() => {
            const otherGotchis = evolvers.map(e => e.gotchi).filter(g => g.index !== heroGotchi.index)
            otherGotchis.forEach(g => g.recycle())
            const gotchiFromParent = (genome: Genome) => heroGotchi.copyWithGenome(genome)
            const population = this.createEvolvers(gotchiFromParent)
            this.evolversNow.next(population)
            this.rebooting = false
        }, 500)
    }

    private nextGenerationFromSurvival(): void {
        this.rebooting = true
        const ranked: Evolver[] = this.rankedEvolvers
        const deadEvolvers = ranked.splice(Math.ceil(ranked.length * SURVIVAL_RATE))
        console.log(`REBOOT: dead=${deadEvolvers.length} remaining=${ranked.length}`)
        this.evolversNow.next(ranked)
        setTimeout(() => {
            const mutants: Gotchi[] = deadEvolvers.map(evolver => {
                evolver.gotchi.recycle()
                const luckyParent = ranked[Math.floor(ranked.length * Math.random())]
                return this.createOffspring(luckyParent.gotchi, luckyParent.currentDirection, false)
            })
            const clones: Gotchi[] = ranked.map(evolver => {
                evolver.gotchi.recycle()
                return this.createOffspring(evolver.gotchi, evolver.currentDirection, true)
            })
            const offspring = mutants.concat(clones)
            this.evolversNow.next([])
            console.log(`survived=${offspring.length}`)
            this.evolversNow.next(offspring.map(gotchi => new Evolver(gotchi, ranked[0].leg)))
            this.rebooting = false
        }, 500)
    }

    private createOffspring(parent: Gotchi, direction: Direction, clone: boolean): Gotchi {
        console.log(`Mutating offspring ${Direction[direction]}`)
        const genome = fromGenomeData(parent.genomeData).withMutatedBehavior(direction, clone ? 0 : MUTATION_COUNT)
        const frozenHero = this.frozenHero
        return frozenHero ? frozenHero.copyWithGenome(genome) : this.hexalot.createGotchi(genome)
    }

    private createEvolvers(createGotchi: (genome: Genome) => Gotchi): Evolver[] {
        const parent = this.frozenHero
        let mutatingGenome = parent ? fromGenomeData(parent.genomeData) : this.hexalot.genome
        const gotchis: Gotchi[] = []
        let direction = Direction.REVERSE // todo: better
        if (parent) {
            direction = parent.direction // todo: actually want the new direction
            gotchis.push(parent)
        }
        while (gotchis.length < MAX_POPULATION) {
            const gotchi = createGotchi(mutatingGenome)
            gotchis.push(gotchi)
            console.log(`Mutating ${gotchis.length} ${Direction[direction]}`)
            mutatingGenome = mutatingGenome.withMutatedBehavior(direction, MUTATION_COUNT)
        }
        return gotchis.map(gotchi => new Evolver(gotchi, this.leg))
    }
}
