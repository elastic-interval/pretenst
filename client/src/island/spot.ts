import {Gotch} from './gotch';
import {Color, Face3, Vector3} from 'three';
import {HUNG_ALTITUDE} from '../body/fabric';

const SCALEX = 8.66;
const SCALEY = 15;

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
const SURFACE_POTENTIAL_GOTCH_COLOR = new Color('mediumseagreen');
const SURFACE_FREE_GOTCH_COLOR = new Color('crimson');
const SURFACE_WATER_COLOR = new Color('darkturquoise');
const HANGER_BASE = 0.7;
const SIX = 6;
const UP = new Vector3(0, 1, 0);
const LAND_NORMAL_SPREAD = 0.06;
const WATER_NORMAL_SPREAD = -0.04;
const HEXAGON_POINTS = [
    new Vector3(0, 0, -10),
    new Vector3(-8.66, 0, -5),
    new Vector3(-8.66, 0, 5),
    new Vector3(0, 0, 10),
    new Vector3(8.66, 0, 5),
    new Vector3(8.66, 0, -5),
    new Vector3()
];

export class Spot {
    public scaledCoords: ICoords;
    public surface = Surface.Unknown;
    public free = false;
    public legal = false;
    public connected = false;
    public adjacentSpots: Spot[] = [];
    public memberOfGotch: Gotch[] = [];
    public adjacentGotches: Gotch[] = [];
    public centerOfGotch?: Gotch;
    public faceNames: string[] = [];

    constructor(public coords: ICoords) {
        this.scaledCoords = {x: coords.x * SCALEX, y: coords.y * SCALEY};
    }

    public refresh() {
        this.free = !this.memberOfGotch.find(gotch => !!gotch.genome);
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

    get canBeNewGotch(): boolean {
        return !this.centerOfGotch && this.adjacentGotches.length > 0 && this.surface === Surface.Land;
    }

    public addSurfaceGeometry(key: string, index: number, vertices: Vector3[], faces: Face3[], freeGotch?: Gotch, masterGotch?: Gotch) {
        this.faceNames = [];
        vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3(
            hexPoint.x + this.scaledCoords.x,
            hexPoint.y,
            hexPoint.z + this.scaledCoords.y
        )));
        let normalSpread = 0;
        let color = SURFACE_UNKNOWN_COLOR;
        switch (this.surface) {
            case Surface.Land:
                if (masterGotch) {
                    color = SURFACE_LAND_COLOR;
                }
                else if (freeGotch) {
                    color = this === freeGotch.center ? SURFACE_FREE_GOTCH_COLOR : SURFACE_LAND_COLOR;
                } else {
                    color = this.canBeNewGotch ? SURFACE_POTENTIAL_GOTCH_COLOR : SURFACE_LAND_COLOR;
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
            vertices.push(new Vector3(
                this.scaledCoords.x,
                HUNG_ALTITUDE,
                this.scaledCoords.y
            ));
            vertices.push(new Vector3(
                hexPoint.x * HANGER_BASE + this.scaledCoords.x,
                hexPoint.y,
                hexPoint.z * HANGER_BASE + this.scaledCoords.y
            ));
        }
    }

    // private get hoverSomething() {
    //     return !!this.centerOfGotch || this.canBeNewGotch || this.free;
    // }
}

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