import { Subject } from "rxjs"
import { Vector3 } from "three"

import { IGotchiFactory } from "../gotchi/gotchi"
import { IAppState, Mode } from "../state/app-state"
import { Transition } from "../state/transition"
import { IStorage } from "../storage/storage"

import { Hexalot, hexalotTreeString } from "./hexalot"
import { ADJACENT, BRANCH_STEP, HEXALOT_SHAPE, STOP_STEP } from "./shapes"
import { coordSort, equals, ICoords, plus, Spot, spotsToString, Surface, zero } from "./spot"

export interface IslandData {
    name: string
    hexalots: string
    spots: string
}

const sortSpotsOnCoord = (a: Spot, b: Spot): number => coordSort(a.coords, b.coords)

export class Island {
    public readonly name: string
    public spots: Spot[] = []
    public hexalots: Hexalot[] = []
    public state: IAppState
    public vacantHexalot?: Hexalot

    constructor(subject: Subject<IAppState>, islandData: IslandData, readonly gotchiFactory: IGotchiFactory, storage: IStorage) {
        this.apply(islandData)
        this.name = islandData.name
        const nonce = 0
        const island = this
        const mode = Mode.Visiting
        const islandIsLegal = false
        const appState: IAppState = {nonce, island, storage, subject, mode, islandIsLegal}
        this.state = new Transition(appState).withRestructure.state
    }

    public get islandIsLegal(): boolean {
        return this.spots.every(spot => spot.isLegal)
    }

    public findHexalot(id: string): Hexalot | undefined {
        return this.hexalots.find(hexalot => hexalot.id === id)
    }

    public recalculate(): void {
        const spots = this.spots
        spots.forEach(spot => {
            spot.adjacentSpots = this.getAdjacentSpots(spot)
            spot.connected = spot.adjacentSpots.length < 6
        })
        let flowChanged = true
        while (flowChanged) {
            flowChanged = false
            spots.forEach(spot => {
                if (spot.connected) {
                    return
                }
                const byAdjacent = spot.adjacentSpots.find(adj => (adj.surface === spot.surface) && adj.connected)
                if (byAdjacent) {
                    spot.connected = true
                    flowChanged = true
                }
            })
        }
    }

    public createHexalot(spot: Spot): Hexalot {
        return this.hexalotAroundSpot(spot)
    }

    public get midpoint(): Vector3 {
        return this.spots
            .reduce((sum: Vector3, spot: Spot) => sum.add(spot.center), new Vector3())
            .multiplyScalar(1 / this.spots.length)
    }

    public get data(): IslandData {
        if (!this.islandIsLegal) {
            throw new Error("Saving illegal island")
        }
        this.spots.sort(sortSpotsOnCoord)
        return {
            name: this.name,
            hexalots: hexalotTreeString(this.hexalots),
            spots: spotsToString(this.spots),
        } as IslandData
    }

    // ================================================================================================

    private apply(data: IslandData): void {
        let hexalot: Hexalot | undefined = this.getOrCreateHexalot(undefined, zero)
        const stepStack = data.hexalots.split("").reverse().map(stepChar => Number(stepChar))
        const hexalotStack: Hexalot[] = []
        while (stepStack.length > 0) {
            const step = stepStack.pop()
            switch (step) {
                case STOP_STEP:
                    hexalot = hexalotStack.pop()
                    break
                case BRANCH_STEP:
                    if (hexalot) {
                        hexalotStack.push(hexalot)
                    }
                    break
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    if (hexalot) {
                        hexalot = this.hexalotAroundSpot(hexalot.spots[step])
                    }
                    break
                default:
                    console.error("Error step")
            }
        }
        const hexChars = data.spots ? data.spots.split("") : []
        const numbers = hexChars.map(hexChar => parseInt(hexChar, 16))
        const booleanArrays = numbers.map(nyb => {
            const b0 = (nyb & 8) !== 0
            const b1 = (nyb & 4) !== 0
            const b2 = (nyb & 2) !== 0
            const b3 = (nyb & 1) !== 0
            return [b0, b1, b2, b3]
        })
        const landStack = [].concat.apply([], booleanArrays).reverse()
        this.spots.sort(sortSpotsOnCoord)
        if (landStack.length) {
            this.spots.forEach(spot => {
                const land = landStack.pop()
                spot.surface = land ? Surface.Land : Surface.Water
            })
        } else if (this.hexalots.length === 1) {
            const singleHexalot = this.hexalots[0]
            singleHexalot.spots.map(spot => spot.surface = Math.random() > 0.5 ? Surface.Land : Surface.Water)
            singleHexalot.spots[0].surface = Surface.Land
        }
        this.hexalots.forEach(lot => lot.refreshId())
    }

    private hexalotAroundSpot(spot: Spot): Hexalot {
        const hexalotParent = spot.adjacentHexalots.reduce(
            (parent: Hexalot | undefined, candiate: Hexalot) => {
                if (parent && parent.nonce >= candiate.nonce) {
                    return parent
                }
                return candiate
            },
            undefined,
        )
        return this.getOrCreateHexalot(hexalotParent, spot.coords)
    }

    private getOrCreateHexalot(parent: Hexalot | undefined, coords: ICoords): Hexalot {
        const existing = this.hexalots.find(existingHexalot => equals(existingHexalot.coords, coords))
        if (existing) {
            return existing
        }
        const spots = HEXALOT_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)))
        const hexalot = new Hexalot(parent, coords, spots, this.gotchiFactory)
        hexalot.refreshId()
        this.hexalots.push(hexalot)
        return hexalot
    }

    private getOrCreateSpot(coords: ICoords): Spot {
        const existing = this.getSpot(coords)
        if (existing) {
            return existing
        }
        const spot = new Spot(coords)
        this.spots.push(spot)
        return spot
    }

    private getAdjacentSpots(spot: Spot): Spot[] {
        const adjacentSpots: Spot[] = []
        const coords = spot.coords
        ADJACENT.forEach(a => {
            const adjacentSpot = this.getSpot(plus(a, coords))
            if (adjacentSpot) {
                adjacentSpots.push(adjacentSpot)
            }
        })
        return adjacentSpots
    }

    private getSpot(coords: ICoords): Spot | undefined {
        return this.spots.find(p => equals(p.coords, coords))
    }
}
