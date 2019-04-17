import { Profile as TwitterPassportProfile } from "passport-twitter"
import { EntityManager, EntityRepository } from "typeorm"

import { ADJACENT, BRANCH_STEP, ERROR_STEP, HEXALOT_SHAPE, STOP_STEP, ZERO } from "./constants"
import { Coords } from "./models/coords"
import { Hexalot } from "./models/hexalot"
import { Island } from "./models/island"
import { Spot } from "./models/spot"
import { TwitterProfile } from "./models/twitterProfile"
import { User } from "./models/user"
import { HexalotID, Surface } from "./types"

interface ILotClaim {
    id: string
    center: Coords
    genomeData: object

    island: Island
    owner: User
}

@EntityRepository()
export class GalapaRepository {
    constructor(private readonly db: EntityManager) {
    }

    public async findIsland(name: string): Promise<Island> {
        return this.db.findOneOrFail(Island, name, {
            relations: ["spots", "hexalots"],
        })
    }

    public async findHexalot(id: string): Promise<Hexalot> {
        return this.db.findOneOrFail(Hexalot, id, {
            relations: ["parent"],
        })
    }

    public async findUser(userId: string): Promise<User> {
        return this.db.findOneOrFail(User, userId, {
            relations: ["ownedLots"],
        })
    }

    public async findOrCreateUserByTwitterProfile(passportProfile: TwitterPassportProfile): Promise<User> {
        const profile = await this.db.findOne(TwitterProfile, passportProfile.id, {
            relations: ["user"],
        })
        if (profile) {
            return profile.user!
        }

        const user = this.db.create(User)
        user.twitterProfile = this.db.create(TwitterProfile, passportProfile)
        await this.db.save(user)
        return user
    }

    public async saveHexalot(lot: Hexalot): Promise<void> {
        await this.db.save(lot)
    }

    public async getAllIslands(): Promise<Island[]> {
        return this.db.find(Island)
    }

    public async claimHexalot(lotClaim: ILotClaim): Promise<Hexalot> {
        const island = lotClaim.island
        const center = lotClaim.center
        const id = lotClaim.id

        const existingLot = await this.db.findOne(Hexalot, id)
        if (existingLot !== undefined) {
            throw new Error("hexalot already claimed")
        }
        let lot: Partial<Hexalot> = {...lotClaim}
        if (island.hexalots.length === 0) {
            // GENESIS LOT
            if (!center.equals(ZERO)) {
                throw new Error("genesis lot must have coords 0,0")
            }
        } else {
            // NOT GENESIS LOT
            const centerSpot = await this.db.findOneOrFail(Spot, {
                where: {coords: center, island: {name: island.name}},
                relations: ["island"],
            })
            lot.parent = await this.findParentHexalot(centerSpot)
        }
        lot = await this.fillHexalotDetails(lot)

        island.hexalots.push(
            this.db.create(Hexalot, lot),
        )
        await this.db.save(island)

        // This will determine whether the new island is still legal
        await this.recalculateIsland(island)

        return this.db.findOneOrFail(Hexalot, lot.id)
    }

    public async fillHexalotDetails(lot: Partial<Hexalot>): Promise<Partial<Hexalot>> {
        const island = lot.island!
        const center = lot.center!


        const surfaces = hexalotIDToSurfaces(lot.id!)
        const existing: { [coords: string]: Spot } = {}
        const spotsFromDb = await this.db.find(Spot, {
            where: HEXALOT_SHAPE.map((offset, i) => {
                return {
                    coords: center.plus(offset),
                    island: {name: island.name},
                }
            }),
        })
        for (const spot of spotsFromDb) {
            existing[spot.coords.toString()] = spot
        }
        const newSpots: Array<Partial<Spot>> = []
        for (const i of Object.keys(HEXALOT_SHAPE)) {
            const coords = center.plus(HEXALOT_SHAPE[i])
            const existingSpot = existing[coords.toString()]
            const newSurface = surfaces[i]
            if (existingSpot) {
                if (newSurface !== existingSpot.surface) {
                    throw new Error("spot surfaces don't match up")
                }
            } else {
                newSpots.push({
                    surface: newSurface,
                    island,
                    coords,
                })
            }
        }
        island.spots = island.spots.concat(
            this.db.create(Spot, newSpots),
        )
        lot.centerSpot = island.getSpotAtCoords(lot.center!)
        lot.nonce = lot.parent ? lot.parent.nonce + 1 : 0
        return lot
    }

    public async recalculateIsland(island: Island): Promise<void> {
        const connected: { [spotId: number]: boolean } = {}
        const map: { [coords: string]: Spot } = {}
        const adjacent: { [spotId: number]: Spot[] } = {}

        // Load relations
        island.hexalots = await this.db.find(Hexalot, {
            where: {island: {name: island.name}},
            relations: ["childHexalots"],
        })
        island.spots = await this.db.find(Spot, {
            where: {island: {name: island.name}},
        })

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

        spots.sort(sortSpotsOnCoord)
        island.geography = {
            hexalots: hexalotTreeString(island.hexalots),
            spots: spotsToString(spots),
        }
        await this.db.save(island)
    }

    private async adjacentHexalots(center: Spot): Promise<Hexalot[]> {
        const where = ADJACENT.map(offset => {
            return {
                coords: center.coords.plus(offset),
                island: {name: center.island.name},
            }
        })
        const adjacentSpots = await this.db.find(Spot, {
            where,
            relations: ["centerOfHexalot"],
        })
        return adjacentSpots
            .map(spot => spot.centerOfHexalot)
            .filter(hexalot => hexalot !== null) as Hexalot[]
    }

    private async findParentHexalot(spot: Spot): Promise<Hexalot> {
        const parent = (await this.adjacentHexalots(spot))
            .reduce(greatestNonce, undefined)
        if (!parent) {
            throw new Error("could not find parent")
        }
        return parent
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

function generateOctalTreePattern(root: Hexalot, steps: number[], visited: { [id: string]: boolean }): number[] {
    const remainingChildren = (root.childHexalots || [])
        .filter(child => {
            return !visited[child.id]
        })
        .map(hexalot => {
            const index = ringIndex(hexalot.center, root.center)
            return {index, hexalot}
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
    visited[root.id] = true
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
