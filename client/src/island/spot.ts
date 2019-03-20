import {Color, Face3, Matrix4, Vector3} from "three"

import {HUNG_ALTITUDE, SPOT_TO_HANGER} from "../body/fabric"
import {SEED_CORNERS} from "../body/fabric-exports"
import {MeshKey} from "../view/spot-selector"

import {Hexalot} from "./hexalot"
import {HEXAGON_POINTS, HEXAPOD_PROJECTION, SCALE_X, SCALE_Y} from "./shapes"

export interface ICoords {
    x: number
    y: number
}

export enum Surface {
    Unknown = "unknown",
    Land = "land",
    Water = "water",
}

const SURFACE_UNKNOWN_COLOR = new Color("silver")
const SURFACE_LAND_COLOR = new Color("tan")
const SURFACE_WATER_COLOR = new Color("darkturquoise")
const SIX = 6
const UP = new Vector3(0, 1, 0)
const LAND_NORMAL_SPREAD = 0.03
const WATER_NORMAL_SPREAD = -0.02

export class Spot {
    public center: Vector3
    public adjacentSpots: Spot[] = []
    public memberOfHexalot: Hexalot[] = []
    public adjacentHexalots: Hexalot[] = []
    public centerOfHexalot?: Hexalot
    public connected = false
    public faceNames: string[] = []
    public surface = Surface.Unknown
    public free = false

    constructor(public coords: ICoords) {
        this.center = new Vector3(coords.x * SCALE_X, 0, coords.y * SCALE_Y)
    }

    public checkFree(singleHexalot: boolean): void {
        const centerOfSingle = singleHexalot && !!this.centerOfHexalot
        this.free = !(centerOfSingle || this.memberOfHexalot.some(hexalot => hexalot.occupied))
    }

    public addSurfaceGeometry(meshKey: MeshKey, index: number, vertices: Vector3[], faces: Face3[]): void {
        const sizeFactor = this.sizeFactor
        vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3(
            hexPoint.x * sizeFactor + this.center.x,
            hexPoint.y * sizeFactor + this.center.y,
            hexPoint.z * sizeFactor + this.center.z,
        )))
        vertices.push(this.center)
        const normalSpread = this.normalSpread
        for (let a = 0; a < SIX; a++) {
            const offset = index * (HEXAGON_POINTS.length + 1)
            const b = (a + 1) % SIX
            const vertexNormals = [
                UP,
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], normalSpread).normalize(),
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], normalSpread).normalize(),
            ]
            this.faceNames.push(`${meshKey}:${faces.length}`)
            faces.push(new Face3(offset + SIX, offset + a, offset + b, vertexNormals, this.color))
        }
    }

    public addHangerGeometry(vertices: Vector3[]): void {
        for (let a = 0; a < SIX; a++) {
            const hexPoint = HEXAGON_POINTS[a]
            const nextHexPoint = HEXAGON_POINTS[(a + 1) % SIX]
            vertices.push(new Vector3().addVectors(this.center, SPOT_TO_HANGER))
            vertices.push(new Vector3().add(this.center).addScaledVector(hexPoint, HEXAPOD_PROJECTION))
            vertices.push(new Vector3().add(this.center).addScaledVector(hexPoint, HEXAPOD_PROJECTION))
            vertices.push(new Vector3().add(this.center).addScaledVector(nextHexPoint, HEXAPOD_PROJECTION))
        }
    }

    public addSeed(rotation: number, meshKey: MeshKey, vertices: Vector3[], faces: Face3[]): void {
        const toTransform: Vector3[] = []
        const hanger = new Vector3(0, HUNG_ALTITUDE, 0)
        const offset = vertices.length
        const R = 1
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const angle = walk * Math.PI * 2 / SEED_CORNERS
            const location = new Vector3(R * Math.sin(angle) + hanger.x, R * Math.cos(angle) + hanger.y, hanger.z)
            toTransform.push(location)
            vertices.push(location)
        }
        const left = vertices.length
        const negative = new Vector3(hanger.x, hanger.y, hanger.z - R)
        vertices.push(negative)
        toTransform.push(negative)
        const right = vertices.length
        const positive = new Vector3(hanger.x, hanger.y, hanger.z + R)
        vertices.push(positive)
        toTransform.push(positive)
        const rotationMatrix = new Matrix4().makeRotationY(Math.PI / 3 * rotation)
        const translationMatrix = new Matrix4().makeTranslation(this.center.x, this.center.y, this.center.z)
        const tranformer = translationMatrix.multiply(rotationMatrix)
        toTransform.forEach(point => point.applyMatrix4(tranformer))
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const next = offset + (walk + 1) % SEED_CORNERS
            const current = offset + walk
            this.faceNames.push(`${meshKey}:${faces.length}`)
            faces.push(new Face3(left, current, next))
            this.faceNames.push(`${meshKey}:${faces.length}`)
            faces.push(new Face3(right, next, current))
        }
    }

    public addRaisedHexagon(vertices: Vector3[], height: number): void {
        const vertex = (hexPoint: Vector3) => vertices.push(new Vector3(0, height, 0).add(this.center).add(hexPoint))
        for (let a = 0; a < SIX; a++) {
            const b = (a + 1) % SIX
            vertex(HEXAGON_POINTS[a])
            vertex(HEXAGON_POINTS[b])
        }
    }

    public addRaisedHexagonParts(vertices: Vector3[], height: number, outerIndex: number, side: number): void {
        const direction = (Math.floor(outerIndex / side) + 5) % 6
        const corner = outerIndex % side === 0
        const vertex = (hexPoint: Vector3) => vertices.push(new Vector3(0, height, 0).add(this.center).add(hexPoint))
        for (let a = 0; a < SIX; a++) {
            const b = (a + 1) % SIX
            if (direction === a || direction === b ||(corner && direction === (b + 1) % SIX)) {
                vertex(HEXAGON_POINTS[a])
                vertex(HEXAGON_POINTS[b])
            }
        }
    }

    public get isLegal(): boolean {
        let landCount = 0
        let waterCount = 0
        this.adjacentSpots.forEach(adjacent => {
            switch (adjacent.surface) {
                case Surface.Land:
                    landCount++
                    break
                case Surface.Water:
                    waterCount++
                    break
            }
        })
        switch (this.surface) {
            case Surface.Land:
                // land must be connected and either on the edge or have adjacent at least 2 land and 1 water
                return this.connected && this.adjacentSpots.length < 6 || (landCount >= 2 && waterCount >= 1)
            case Surface.Water:
                // water must have some land around
                return landCount > 0
            default:
                return false
        }
    }

    public get canBeClaimed(): boolean {
        if (this.surface !== Surface.Land) {
            return false
        }
        const centerOfHexalot = this.centerOfHexalot
        if (centerOfHexalot) {
            return !centerOfHexalot.occupied
        }
        return this.adjacentHexalots.some(hexalot => hexalot.occupied)
    }

    private get sizeFactor(): number {
        return this.isLegal ? 1 : 0.9
    }

    private get color(): Color {
        switch (this.surface) {
            case Surface.Land:
                return SURFACE_LAND_COLOR
            case Surface.Water:
                return SURFACE_WATER_COLOR
            default:
                return SURFACE_UNKNOWN_COLOR
        }
    }

    private get normalSpread(): number {
        switch (this.surface) {
            case Surface.Land:
                return LAND_NORMAL_SPREAD
            case Surface.Water:
                return WATER_NORMAL_SPREAD
            default:
                return 0
        }
    }
}

/*
    const geometry = new BufferGeometry();
    const positions = new Float32Array(360 * 6 / WALL_STEP_DEGREES);
    let slot = 0;
    for (let degrees = 0; degrees < 360; degrees += WALL_STEP_DEGREES) {
        const r1 = Math.PI * 2 * degrees / 360;
        const r2 = Math.PI * 2 * (degrees + WALL_STEP_DEGREES) / 360;
        positions[slot++] = radius * Math.sin(r1) + center.x;
        positions[slot++] = FRONTIER_ALTITUDE + center.y;
        positions[slot++] = radius * Math.cos(r1) + center.z;
        positions[slot++] = radius * Math.sin(r2) + center.x;
        positions[slot++] = FRONTIER_ALTITUDE + center.y;
        positions[slot++] = radius * Math.cos(r2) + center.z;
    }
    geometry.addAttribute('position', new Float32BufferAttribute(positions, 3));

 */

export const coordSort = (a: ICoords, b: ICoords): number =>
    a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0

export const zero: ICoords = {x: 0, y: 0}

export const equals = (a: ICoords, b: ICoords): boolean => a.x === b.x && a.y === b.y

export const minus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x - b.x, y: a.y - b.y}
}

export const plus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x + b.x, y: a.y + b.y}
}

const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + "0") : s

export const spotsToString = (spots: Spot[]) => {
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
