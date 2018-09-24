import {Gotch} from './gotch';

const SCALEX = 8.66;
const SCALEY = 15;

export interface ICoords {
    x: number;
    y: number;
}

export class Spot {
    public scaledCoords: ICoords;
    public lit = false;
    public free = false;
    public memberOfGotch: Gotch[] = [];
    public adjacentGotches: Gotch[] = [];
    public centerOfGotch?: Gotch;
    public faceIndexes: number[] = [];

    constructor(public coords: ICoords) {
        this.scaledCoords = {x: coords.x * SCALEX, y: coords.y * SCALEY};
    }

    get canBeNewGotch(): boolean {
        return !this.centerOfGotch && this.adjacentGotches.length > 0;
    }

    public updateFreeFlag() {
        this.free = !this.memberOfGotch.find(gotch => !!gotch.owner);
    }
}

export const coordSort = (a: ICoords, b: ICoords): number => a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0;
export const sortSpotsOnCoord = (a: Spot, b: Spot): number => coordSort(a.coords, b.coords);
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
    const lit = spots.map(spot => spot.lit ? '1' : '0');
    const nybbleStrings = lit.map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join('') : null)
    const nybbleChars = nybbleStrings.map(chunk => {
        if (chunk) {
            return parseInt(padRightTo4(chunk), 2).toString(16);
        } else {
            return '';
        }
    });
    return nybbleChars.join('');
};