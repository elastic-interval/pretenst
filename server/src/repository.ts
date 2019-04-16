import { EntityManager, EntityRepository } from "typeorm"

import { ADJACENT, BRANCH_STEP, ERROR_STEP, HEXALOT_SHAPE, STOP_STEP, ZERO } from "./constants"
import { Coords } from "./models/coords"
import { Hexalot } from "./models/hexalot"
import { Island } from "./models/island"
import { Spot } from "./models/spot"
import { User } from "./models/user"
import { HexalotID, Surface } from "./types"

@EntityRepository()
export class Repository {
    constructor(private readonly db: EntityManager) {
    }

    public async findIsland(name: string): Promise<Island> {
        return this.db.findOneOrFail(Island, name)
    }

    public async findHexalot(id: string): Promise<Hexalot> {
        return this.db.findOneOrFail(Hexalot, id)
    }

    public async findUser(userId: string): Promise<User> {
        return this.db.findOneOrFail(User, userId)
    }

    public async save(entities: Array<Island | Hexalot | User | Spot>): Promise<void> {
        await this.db.save(entities)
    }

    public async claimHexalot(lot: Partial<Hexalot>): Promise<void> {
        let island = lot.island!
        const center = lot.center!
        const id = lot.id!

        const existingLot = await this.db.findOne(Hexalot, id)
        if (existingLot !== undefined) {
            throw new Error("hexalot already claimed")
        }

        if (island.hexalots.length === 0) {
            // GENESIS LOT
            if (!center.equals(ZERO)) {
                throw new Error("genesis lot must have coords 0,0")
            }
        } else {
            // NOT GENESIS LOT
            const centerSpot = await this.db.findOneOrFail(Spot, {where: {coords: center}})
            lot.parent = await this.findParentHexalot(centerSpot)
        }
        lot = await this.populateHexalot(lot)

        await this.db.save([island, lot])

        // Reload island with new relations
        island = await this.db.findOneOrFail(Island, island.name)
        await this.recalculateIsland(island)
    }

    public async getAllIslands(): Promise<Island[]> {
        return this.db.find(Island)
    }

    public async recalculateIsland(island: Island): Promise<void> {
        const connected: { [spotId: number]: boolean } = {}
        const map: { [coords: string]: Spot } = {}
        const adjacent: { [spotId: number]: Spot[] } = {}
        const spots = island.spots

        for (const spot of spots) {
            map[spot.coords.toString()] = spot
        }
        for (const spot of spots) {
            adjacent[spot.id] = ADJACENT
                .map(offset => map[spot.coords.plus(offset).toString()])
                .filter(s => s !== undefined)
        }
        for (const spot of spots) {
            connected[spot.id] = adjacent[spot.id].length < 6
        }

        const isSpotLegal = async (spot: Spot) => {
            let landCount = 0
            let waterCount = 0
            adjacent[spot.id].forEach(adj => {
                switch (adj.surface) {
                    case Surface.Land:
                        landCount++
                        break
                    case Surface.Water:
                        waterCount++
                        break
                }
            })
            switch (spot.surface) {
                case Surface.Land:
                    // land must be connected and either on the edge or have adjacent at least 2 land and 1 water
                    return connected[spot.id] && adjacent[spot.id].length < 6 || (landCount >= 2 && waterCount >= 1)
                case Surface.Water:
                    // water must have some land around
                    return landCount > 0
                default:
                    return false
            }
        }

        let flowChanged = true
        while (flowChanged) {
            flowChanged = false
            for (const spot of spots) {
                if (connected[spot.id]) {
                    continue
                }
                const byAdjacent = adjacent[spot.id]
                    .find(adj => (adj.surface === spot.surface) && connected[adj.id])
                if (byAdjacent) {
                    connected[spot.id] = true
                    flowChanged = true
                }
            }
        }

        for (const spot of island.spots) {
            if (!await isSpotLegal(spot)) {
                throw new Error("Illegal spot")
            }
        }

        // Load hexalot children
        island.hexalots = await this.db.find(Hexalot, {
            where: {island: {name: island.name}},
            relations: ["childHexalots"],
        })

        spots.sort(sortSpotsOnCoord)
        island.geography = {
            hexalots: hexalotTreeString(island.hexalots),
            spots: spotsToString(spots),
        }
        await this.db.save(island)
    }

    private async populateHexalot(lot: Partial<Hexalot>): Promise<Hexalot> {
        const surfaces = hexalotIDToSurfaces(lot.id!)
        const spots = await Promise.all(
            HEXALOT_SHAPE.map(async (offset, i) => {
                const coords = lot.center!.plus(offset)
                let spot = await this.db.findOne(Spot, {
                    where: {coords, island: {name: lot.island!.name}},
                })
                if (!spot) {
                    spot = this.db.create(Spot, {
                        surface: surfaces[i],
                        island: lot.island!,
                        coords,
                    })
                }
                return spot
            }),
        )
        const nonce = lot.parent ? lot.parent.nonce + 1 : 0
        return this.db.create(Hexalot, {
            ...lot,
            nonce,
            spots,
        })
    }

    private async adjacentHexalots(center: Spot): Promise<Hexalot[]> {
        const spots = await Promise.all(
            ADJACENT.map(offset => {
                return this.db.findOne(Hexalot, {
                    where: {
                        center: center.coords.plus(offset),
                        island: center.island,
                    },
                })
            }),
        )
        return spots.filter(s => s !== undefined) as Hexalot[]
    }

    private async findParentHexalot(spot: Spot): Promise<Hexalot | undefined> {
        return (await this.adjacentHexalots(spot))
            .reduce(greatestNonce, undefined)
    }
}

export function findSpot(island: Island, coords: Coords): Spot | undefined {
    return island.spots.find(p => coords.equals(p.coords)) as (Spot | undefined)
}

function greatestNonce(parent: Hexalot | undefined, candidate: Hexalot): Hexalot | undefined {
    if (parent && parent.nonce >= candidate.nonce) {
        return parent
    }
    return candidate
}

function coordSort(a: Coords, b: Coords): number {
    return a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0
}

function sortSpotsOnCoord(a: Spot, b: Spot): number {
    return coordSort(a.coords, b.coords)
}

function ringIndex(coords: Coords, origin: Coords): number {
    const ringCoords = coords.minus(origin)
    for (let index = 1; index <= 6; index++) {
        if (ringCoords.x === HEXALOT_SHAPE[index].x && ringCoords.y === HEXALOT_SHAPE[index].y) {
            return index
        }
    }
    return 0
}

function generateOctalTreePattern(hexalot: Hexalot, steps: number[], visited: { [id: string]: boolean }): number[] {
    const remainingChildren = (hexalot.childHexalots || [])
        .filter(child => {
            return !visited[child.id]
        })
        .map(h => {
            const index = ringIndex(h.center, hexalot.center)
            return {index, hexalot: h}
        })
        .sort((a, b) => {
            return a.index < b.index ? 1 : a.index > b.index ? -1 : 0
        })
    if (remainingChildren.length > 0) {
        for (let child = remainingChildren.pop(); child; child = remainingChildren.pop()) {
            if (remainingChildren.length > 0) {
                steps.push(BRANCH_STEP)
            }
            steps.push(child.index > 0 ? child.index : ERROR_STEP)
            generateOctalTreePattern(child.hexalot, steps, visited)
        }
    } else {
        steps.push(STOP_STEP)
    }
    visited[hexalot.id] = true
    return steps
}

function padRightTo4(s: string): string {
    return s.length < 4 ? padRightTo4(s + "0") : s
}

function hexalotIDToSurfaces(hexalotID: HexalotID): Surface[] {
    function* surfaceIterator(): Iterable<Surface> {
        for (const nybStr of hexalotID.split("")) {
            const nyb = parseInt(nybStr, 16)
            for (let bit = 0; bit < 4; bit++) {
                const surface: Surface = (nyb & (0x1 << (3 - bit))) !== 0 ?
                    Surface.Land :
                    Surface.Water
                yield surface
            }
        }
    }

    return [...surfaceIterator()].slice(0, 127)
}

function spotsToString(spots: Spot[]): string {
    const land = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = land.map((l, index, array) =>
        (index % 4 === 0) ? array.slice(index, index + 4).join("") : undefined)
    const nybbleChars = nybbleStrings.map(chunk => {
        if (chunk) {
            return parseInt(padRightTo4(chunk), 2).toString(16)
        } else {
            return ""
        }
    })
    return nybbleChars.join("")
}

function hexalotTreeString(hexalots: Hexalot[]): string {
    const root = hexalots.find(hexalot => hexalot.nonce === 0)
    if (!root) {
        return ""
    }
    return generateOctalTreePattern(root, [], {}).join("")
}
