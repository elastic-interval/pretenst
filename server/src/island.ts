import { ADJACENT, BRANCH_STEP, ERROR_STEP, HEXALOT_SHAPE, STOP_STEP } from "./shapes"
import { IslandStore } from "./store"
import { HexalotID, PubKey } from "./types"

enum Surface {
    Unknown = "unknown",
    Land = "land",
    Water = "water",
}

interface ISpot {
    connected: boolean
    coords: ICoords
    adjacentSpots: ISpot[]
    memberOfHexalot: IHexalot[]
    adjacentHexalots: IHexalot[]
    centerOfHexalot?: IHexalot
    surface: Surface
}

interface IHexalot {
    id: HexalotID
    coords: ICoords
    childHexalots: IHexalot[]
    spots: ISpot[]
    nonce: number
    owner?: PubKey
    genomeData: string | null
}

interface IHexalotIndexed extends IHexalot {
    index: number
}

const ZERO: ICoords = {x: 0, y: 0}
const equals = (a: ICoords, b: ICoords): boolean => a.x === b.x && a.y === b.y
const coordSort = (a: ICoords, b: ICoords): number =>
    a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0

function coordsToString(coords: ICoords): string {
    return `${coords.x},${coords.y}`
}

const plus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x + b.x, y: a.y + b.y}
}

const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + "0") : s

const spotsToString = (spots: ISpot[]) => {
    const land = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = land.map((l, index, array) =>
        (index % 4 === 0) ? array.slice(index, index + 4).join("") : null)
    const nybbleChars = nybbleStrings.map(chunk => {
        if (chunk) {
            return parseInt(padRightTo4(chunk), 2).toString(16)
        } else {
            return ""
        }
    })
    return nybbleChars.join("")
}

const ringIndex = (coords: ICoords, origin: ICoords): number => {
    const ringCoords: ICoords = {x: coords.x - origin.x, y: coords.y - origin.y}
    for (let index = 1; index <= 6; index++) {
        if (ringCoords.x === HEXALOT_SHAPE[index].x && ringCoords.y === HEXALOT_SHAPE[index].y) {
            return index
        }
    }
    return 0
}

function generateOctalTreePattern(
    root: IHexalot,
    steps: number[],
    visited: { [coords: string]: boolean },
): number[] {
    const remainingChildren = root.childHexalots
        .filter(child => !visited[coordsToString(child.coords)])
        .map(child => {
            const index = ringIndex(child.coords, root.coords)
            return {index, ...child} as IHexalotIndexed
        })
        .sort((a, b) => a.index < b.index ? 1 : a.index > b.index ? -1 : 0)
    if (remainingChildren.length > 0) {
        for (let child = remainingChildren.pop(); child; child = remainingChildren.pop()) {
            if (remainingChildren.length > 0) {
                steps.push(BRANCH_STEP)
            }
            steps.push(child.index > 0 ? child.index : ERROR_STEP)
            generateOctalTreePattern(child, steps, visited)
        }
    } else {
        steps.push(STOP_STEP)
    }
    visited[coordsToString(root.coords)] = true
    return steps
}

const hexalotTreeString = (hexalots: IHexalot[]) => {
    const root = hexalots.find(hexalot => hexalot.nonce === 0)
    if (!root) {
        console.error("No root hexalot found")
        return ""
    }
    return generateOctalTreePattern(root, [], {}).join("")
}

interface ICoords {
    x: number
    y: number
}

export interface IslandPattern {
    hexalots: string
    spots: string
}

const sortSpotsOnCoord = (a: ISpot, b: ISpot): number => coordSort(a.coords, b.coords)

const hexalotWithMaxNonce = (hexalots: IHexalot[]): IHexalot | null =>
    hexalots.length === 0 ?
        null :
        hexalots.reduce((withMax, adjacent) => {
            if (withMax) {
                return adjacent.nonce > withMax.nonce ? adjacent : withMax
            } else {
                return adjacent
            }
        })

function canBeNewHexalot(spot: ISpot): boolean {
    return false
}

function refreshSpot(spot: ISpot): ISpot {
    return spot
}

export class Island {
    public spots: ISpot[] = []
    public hexalots: IHexalot[] = []

    constructor(
        readonly islandName: string,
        readonly store: IslandStore,
    ) {
    }

    public get isLegal(): boolean {
        return !this.spots.find(spot => !spot) // TODO
    }

    public async loadPatternFromStore(): Promise<void> {
        const pattern = await this.store.getPattern()
        if (!pattern) {
            throw new Error("Pattern not found")
        }
        return this.apply(pattern)
    }

    public claimHexalot(
        coords: ICoords,
        newID: HexalotID,
        genome: string,
    ): void {
        throw new Error("not implemented")
        // TODO
    }

    public findHexalot(id: HexalotID): IHexalot | undefined {
        return this.hexalots.find(hexalot => hexalot.id === id)
    }

    public refreshStructure(): void {
        this.spots.forEach(spot => {
            spot.adjacentSpots = this.getAdjacentSpots(spot)
            spot.connected = spot.adjacentSpots.length < 6
        })
        let flowChanged = true
        while (flowChanged) {
            flowChanged = false
            this.spots.forEach(spot => {
                if (!spot.connected) {
                    const connectedByAdjacent = spot.adjacentSpots
                        .find(adj => (adj.surface === spot.surface) && adj.connected)
                    if (connectedByAdjacent) {
                        spot.connected = true
                        flowChanged = true
                    }
                }
            })
        }
        this.spots.forEach(refreshSpot)
    }

    public async save(): Promise<void> {
        await this.store.setPattern(this.pattern)
    }

    public createHexalot(spot: ISpot, owner: PubKey): IHexalot | null {
        if (!canBeNewHexalot(spot)) {
            console.error(`${JSON.stringify(spot.coords)} cannot be a hexalot!`)
            return null
        }
        return this.hexalotAroundSpot(spot)
    }

    public get pattern(): IslandPattern {
        if (!this.isLegal) {
            throw new Error("Saving illegal island")
        }
        this.spots.sort(sortSpotsOnCoord)
        return {
            hexalots: hexalotTreeString(this.hexalots),
            spots: spotsToString(this.spots),
        }
    }

    // ================================================================================================

    private async apply(pattern: IslandPattern): Promise<void> {
        let hexalot: IHexalot | undefined = this.getOrCreateHexalot(undefined, ZERO)
        const stepStack = pattern.hexalots.split("").reverse().map(Number)
        const hexalotStack: IHexalot[] = []
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
        const hexChars = pattern.spots ? pattern.spots.split("") : []
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
        }
        this.refreshStructure()
    }

    private hexalotAroundSpot(spot: ISpot): IHexalot {
        const adjacentMaxNonce = hexalotWithMaxNonce(spot.adjacentHexalots)!
        return this.getOrCreateHexalot(adjacentMaxNonce, spot.coords)
    }

    private getOrCreateHexalot(parent: IHexalot | undefined, coords: ICoords): IHexalot {
        const existing = this.hexalots.find(existingHexalot => equals(existingHexalot.coords, coords))
        if (existing) {
            return existing
        }
        const spots = HEXALOT_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)))
        const hexalot: IHexalot = {
            id: "",
            coords,
            spots,
            childHexalots: [],
            genomeData: null,
            nonce: parent ? parent.nonce + 1 : 0,
            // TODO
        }
        this.hexalots.push(hexalot)
        return hexalot
    }

    private getOrCreateSpot(coords: ICoords): ISpot {
        const existing = this.getSpot(coords)
        if (existing) {
            return existing
        }
        const spot: ISpot = {
            surface: Surface.Unknown,
            adjacentHexalots: [],
            connected: false,
            adjacentSpots: [],
            memberOfHexalot: [],
            coords,
            // TODO
        }
        this.spots.push(spot)
        return spot
    }

    private getAdjacentSpots(spot: ISpot): ISpot[] {
        const adjacentSpots: ISpot[] = []
        const coords = spot.coords
        ADJACENT.forEach(a => {
            const adjacentSpot = this.getSpot(plus(a, coords))
            if (adjacentSpot) {
                adjacentSpots.push(adjacentSpot)
            }
        })
        return adjacentSpots
    }

    private getSpot(coords: ICoords): ISpot | undefined {
        return this.spots.find(p => equals(p.coords, coords))
    }
}
