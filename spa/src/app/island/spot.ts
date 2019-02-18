import {Hexalot} from './hexalot';
import {Color, Face3, Vector3} from 'three';
import {HUNG_ALTITUDE, SPOT_TO_HANGER} from '../body/fabric';
import {HEXAGON_POINTS, HEXAPOD_PROJECTION, SCALE_X, SCALE_Y} from './shapes';
import {SEED_CORNERS} from '../body/fabric-exports';

export interface ICoords {
    x: number;
    y: number;
}

export enum Surface {
    Unknown = 'unknown',
    Land = 'land',
    Water = 'water'
}

const SURFACE_UNKNOWN_COLOR = new Color('silver');
const SURFACE_LAND_COLOR = new Color('tan');
const SURFACE_CLICKABLE_COLOR = new Color('mediumseagreen');
const SURFACE_FREE_GOTCH_COLOR = new Color('crimson');
const SURFACE_WATER_COLOR = new Color('darkturquoise');
const SIX = 6;
const UP = new Vector3(0, 1, 0);
const LAND_NORMAL_SPREAD = 0.03;
const WATER_NORMAL_SPREAD = -0.02;

export class Spot {
    public surface = Surface.Unknown;
    public free = false;
    public legal = false;
    public connected = false;
    public adjacentSpots: Spot[] = [];
    public memberOfHexalot: Hexalot[] = [];
    public adjacentHexalots: Hexalot[] = [];
    public centerOfHexalot?: Hexalot;
    public faceNames: string[] = [];
    public center: Vector3;

    constructor(public coords: ICoords) {
        this.center = new Vector3(coords.x * SCALE_X, 0, coords.y * SCALE_Y);
    }

    public refresh() {
        this.free = !this.memberOfHexalot.find(hexalot => !!hexalot.genome);
        if (!this.connected) {
            this.legal = false;
        } else {
            let landCount = 0;
            let waterCount = 0;
            this.adjacentSpots.forEach(adjacent => {
                switch (adjacent.surface) {
                    case Surface.Land:
                        landCount++;
                        break;
                    case Surface.Water:
                        waterCount++;
                        break;
                }
            });
            switch (this.surface) {
                case Surface.Unknown:
                    this.legal = false;
                    break;
                case Surface.Land:
                    // land must be either on the edge or have adjacent at least 2 land and 1 water
                    this.legal = this.adjacentSpots.length < 6 || (landCount >= 2 && waterCount >= 1);
                    break;
                case Surface.Water:
                    // water must have some land around
                    this.legal = landCount > 0;
                    break;
            }
        }
    }

    get canBeNewHexalot(): boolean {
        if (this.centerOfHexalot || this.surface !== Surface.Land) {
            return false;
        }
        return !!this.adjacentHexalots.find(hexalot => !!hexalot.genome);
    }

    public addSurfaceGeometry(key: string, index: number, vertices: Vector3[], faces: Face3[], legal: boolean, freeHexalot?: Hexalot, masterHexalot?: Hexalot) {
        this.faceNames = [];
        vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3(
            hexPoint.x + this.center.x,
            hexPoint.y + this.center.y,
            hexPoint.z + this.center.z
        )));
        let normalSpread = 0;
        let color = SURFACE_UNKNOWN_COLOR;
        switch (this.surface) {
            case Surface.Land:
                if (masterHexalot) {
                    color = SURFACE_LAND_COLOR;
                }
                else if (freeHexalot) {
                    const centerColor = legal ? SURFACE_CLICKABLE_COLOR : SURFACE_FREE_GOTCH_COLOR;
                    const landColor = this.canBeNewHexalot ? SURFACE_CLICKABLE_COLOR : SURFACE_LAND_COLOR;
                    color = this === freeHexalot.centerSpot ? centerColor : landColor;
                } else {
                    color = this.canBeNewHexalot ? SURFACE_CLICKABLE_COLOR : SURFACE_LAND_COLOR;
                }
                normalSpread = this.legal ? LAND_NORMAL_SPREAD : 0;
                break;
            case Surface.Water:
                color = SURFACE_WATER_COLOR;
                normalSpread = this.legal ? WATER_NORMAL_SPREAD : 0;
                break;
        }
        for (let a = 0; a < SIX; a++) {
            const offset = index * HEXAGON_POINTS.length;
            const b = (a + 1) % SIX;
            const vertexNormals = [
                UP,
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], normalSpread).normalize(),
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], normalSpread).normalize()
            ];
            this.faceNames.push(`${key}:${faces.length}`);
            faces.push(new Face3(offset + SIX, offset + a, offset + b, vertexNormals, color));
        }
    }

    public addHangerGeometry(vertices: Vector3[]) {
        for (let a = 0; a < SIX; a++) {
            const hexPoint = HEXAGON_POINTS[a];
            const nextHexPoint = HEXAGON_POINTS[(a + 1) % SIX];
            vertices.push(new Vector3().addVectors(this.center, SPOT_TO_HANGER));
            vertices.push(new Vector3().add(this.center).addScaledVector(hexPoint, HEXAPOD_PROJECTION));
            vertices.push(new Vector3().add(this.center).addScaledVector(hexPoint, HEXAPOD_PROJECTION));
            vertices.push(new Vector3().add(this.center).addScaledVector(nextHexPoint, HEXAPOD_PROJECTION));
        }
    }

    public addSeed(vertices: Vector3[], faces: Face3[]): void {
        const hanger = new Vector3(this.center.x, HUNG_ALTITUDE, this.center.z);
        const offset = vertices.length;
        const R = 1;
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const angle = walk * Math.PI * 2 / SEED_CORNERS;
            vertices.push(new Vector3(R * Math.sin(angle) + hanger.x, R * Math.cos(angle) + hanger.y, hanger.z));
        }
        const left = vertices.length;
        vertices.push(new Vector3(hanger.x, hanger.y, hanger.z - R));
        const right = vertices.length;
        vertices.push(new Vector3(hanger.x, hanger.y, hanger.z + R));
        for (let walk = 0; walk < SEED_CORNERS; walk++) {
            const next = offset + (walk + 1) % SEED_CORNERS;
            const current = offset + walk;
            faces.push(new Face3(left, current, next));
            faces.push(new Face3(right, next, current));
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


export const coordSort = (a: ICoords, b: ICoords): number => a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0;
export const zero: ICoords = {x: 0, y: 0};
export const equals = (a: ICoords, b: ICoords): boolean => a.x === b.x && a.y === b.y;
export const minus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x - b.x, y: a.y - b.y};
};
export const plus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x + b.x, y: a.y + b.y};
};
const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + '0') : s;
export const spotsToString = (spots: Spot[]) => {
    const land = spots.map(spot => spot.surface === Surface.Land ? '1' : '0');
    const nybbleStrings = land.map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join('') : null);
    const nybbleChars = nybbleStrings.map(chunk => {
        if (chunk) {
            return parseInt(padRightTo4(chunk), 2).toString(16);
        } else {
            return '';
        }
    });
    return nybbleChars.join('');
};
