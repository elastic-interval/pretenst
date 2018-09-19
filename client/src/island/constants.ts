import {Cell} from './cell';
import {Gotch} from './gotch';
import {Patch} from './patch';
import {Token} from './token';

export const SCALE = 0.08;
export const SPREAD = 1.05;
export const SCALE_Y = SPREAD * SCALE * Math.sqrt(3);
export const SCALE_X = SPREAD * SCALE;
export const ZOOM_VIEW_BOX = {
    h: 3,
    w: 3,
    x: -1.5,
    y: -1.5,
};
export const HEXAGON_POINTS = '0,-1 -0.866,-0.5 -0.866,0.5 0,1 0.866,0.5 0.866,-0.5';
export const HEXAGON_RAYS = [
    {x: 0, y: -1},
    {x: -0.866, y: -0.5},
    {x: -0.866, y: 0.5},
    {x: 0, y: 1},
    {x: 0.866, y: 0.5},
    {x: 0.866, y: -0.5},
];
export const STOP_STEP = 0;
export const BRANCH_STEP = 7;
export const ERROR_STEP = 8;

export const GOTCH_DISTANCE = 0.8;
export const GOTCH_SCALE = SCALE * 3.8;

export const TOKEN_SHAPE = [
    // center
    {x: 0, y: 0},
    // layer 1
    {x: 2, y: 0}, // 1
    {x: 1, y: -1},
    {x: -1, y: -1},
    {x: -2, y: 0},
    {x: -1, y: 1},
    {x: 1, y: 1}, // 6
    // layer 2
    {x: 4, y: 0}, // 7
    {x: 3, y: -1},
    {x: 2, y: -2},
    {x: 0, y: -2},
    {x: -2, y: -2},
    {x: -3, y: -1},
    {x: -4, y: 0},
    {x: -3, y: 1},
    {x: -2, y: 2},
    {x: 0, y: 2},
    {x: 2, y: 2},
    {x: 3, y: 1}, // 18
    // layer 3
    {x: 6, y: 0}, // 19
    {x: 5, y: -1},
    {x: 4, y: -2},
    {x: 3, y: -3},
    {x: 1, y: -3},
    {x: -1, y: -3},
    {x: -3, y: -3},
    {x: -4, y: -2},
    {x: -5, y: -1},
    {x: -6, y: 0},
    {x: -5, y: 1},
    {x: -4, y: 2},
    {x: -3, y: 3},
    {x: -1, y: 3},
    {x: 1, y: 3},
    {x: 3, y: 3},
    {x: 4, y: 2},
    {x: 5, y: 1}, // 36
    // layer 4
    {x: 8, y: 0}, // 37
    {x: 7, y: -1},
    {x: 6, y: -2},
    {x: 5, y: -3},
    {x: 4, y: -4},
    {x: 2, y: -4},
    {x: 0, y: -4},
    {x: -2, y: -4},
    {x: -4, y: -4},
    {x: -5, y: -3},
    {x: -6, y: -2},
    {x: -7, y: -1},
    {x: -8, y: 0},
    {x: -7, y: 1},
    {x: -6, y: 2},
    {x: -5, y: 3},
    {x: -4, y: 4},
    {x: -2, y: 4},
    {x: -0, y: 4},
    {x: 2, y: 4},
    {x: 4, y: 4},
    {x: 5, y: 3},
    {x: 6, y: 2},
    {x: 7, y: 1}, // 60
    // layer 5
    {x: 10, y: 0}, // 61
    {x: 9, y: -1},
    {x: 8, y: -2},
    {x: 7, y: -3},
    {x: 6, y: -4},
    {x: 5, y: -5},
    {x: 3, y: -5},
    {x: 1, y: -5},
    {x: -1, y: -5},
    {x: -3, y: -5},
    {x: -5, y: -5},
    {x: -6, y: -4},
    {x: -7, y: -3},
    {x: -8, y: -2},
    {x: -9, y: -1},
    {x: -10, y: 0},
    {x: -9, y: 1},
    {x: -8, y: 2},
    {x: -7, y: 3},
    {x: -6, y: 4},
    {x: -5, y: 5},
    {x: -3, y: 5},
    {x: -1, y: 5},
    {x: 1, y: 5},
    {x: 3, y: 5},
    {x: 5, y: 5},
    {x: 6, y: 4},
    {x: 7, y: 3},
    {x: 8, y: 2},
    {x: 9, y: 1}, // 90
    // layer 6
    {x: 12, y: 0}, // 91
    {x: 11, y: -1},
    {x: 10, y: -2},
    {x: 9, y: -3},
    {x: 8, y: -4},
    {x: 7, y: -5},
    {x: 6, y: -6},
    {x: 4, y: -6},
    {x: 2, y: -6},
    {x: 0, y: -6},
    {x: -2, y: -6},
    {x: -4, y: -6},
    {x: -6, y: -6},
    {x: -7, y: -5},
    {x: -8, y: -4},
    {x: -9, y: -3},
    {x: -10, y: -2},
    {x: -11, y: -1},
    {x: -12, y: 0},
    {x: -11, y: 1},
    {x: -10, y: 2},
    {x: -9, y: 3},
    {x: -8, y: 4},
    {x: -7, y: 5},
    {x: -6, y: 6},
    {x: -4, y: 6},
    {x: -2, y: 6},
    {x: 0, y: 6},
    {x: 2, y: 6},
    {x: 4, y: 6},
    {x: 6, y: 6},
    {x: 7, y: 5},
    {x: 8, y: 4},
    {x: 9, y: 3},
    {x: 10, y: 2},
    {x: 11, y: 1}, // 126
    // layer 7
    {x: 14, y: 0}, // 127
    {x: 13, y: -1},
    {x: 12, y: -2},
    {x: 11, y: -3},
    {x: 10, y: -4},
    {x: 9, y: -5},
    {x: 8, y: -6},
    {x: 7, y: -7},
    {x: 5, y: -7},
    {x: 3, y: -7},
    {x: 1, y: -7},
    {x: -1, y: -7},
    {x: -3, y: -7},
    {x: -5, y: -7},
    {x: -7, y: -7},
    {x: -8, y: -6},
    {x: -9, y: -5},
    {x: -10, y: -4},
    {x: -11, y: -3},
    {x: -12, y: -2},
    {x: -13, y: -1},
    {x: -14, y: 0},
    {x: -13, y: 1},
    {x: -12, y: 2},
    {x: -11, y: 3},
    {x: -10, y: 4},
    {x: -9, y: 5},
    {x: -8, y: 6},
    {x: -7, y: 7},
    {x: -5, y: 7},
    {x: -3, y: 7},
    {x: -1, y: 7},
    {x: 1, y: 7},
    {x: 3, y: 7},
    {x: 5, y: 7},
    {x: 7, y: 7},
    {x: 8, y: 6},
    {x: 9, y: 5},
    {x: 10, y: 4},
    {x: 11, y: 3},
    {x: 12, y: 2},
    {x: 13, y: 1}, // 168
    // layer 8
    {x: 16, y: 0}, // 169
    {x: 15, y: -1},
    {x: 14, y: -2},
    {x: 13, y: -3},
    {x: 12, y: -4},
    {x: 11, y: -5},
    {x: 10, y: -6},
    {x: 9, y: -7},
    {x: 8, y: -8},
    {x: 6, y: -8},
    {x: 4, y: -8},
    {x: 2, y: -8},
    {x: 0, y: -8},
    {x: -2, y: -8},
    {x: -4, y: -8},
    {x: -6, y: -8},
    {x: -8, y: -8},
    {x: -9, y: -7},
    {x: -10, y: -6},
    {x: -11, y: -5},
    {x: -12, y: -4},
    {x: -13, y: -3},
    {x: -14, y: -2},
    {x: -15, y: -1},
    {x: -16, y: 0},
    {x: -15, y: 1},
    {x: -14, y: 2},
    {x: -13, y: 3},
    {x: -12, y: 4},
    {x: -11, y: 5},
    {x: -10, y: 6},
    {x: -9, y: 7},
    {x: -8, y: 8},
    {x: -6, y: 8},
    {x: -4, y: 8},
    {x: -2, y: 8},
    {x: 0, y: 8},
    {x: 2, y: 8},
    {x: 4, y: 8},
    {x: 6, y: 8},
    {x: 8, y: 8},
    {x: 9, y: 7},
    {x: 10, y: 6},
    {x: 11, y: 5},
    {x: 12, y: 4},
    {x: 13, y: 3},
    {x: 14, y: 2},
    {x: 15, y: 1}, // 216
];
export const ROTATE = [
    0,
    2, 3, 4, 5, 6, 1,

    9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 7, 8,

    22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 33,
    34, 35, 36, 19, 20, 21,

    41, 42, 43, 44, 45, 46,
    47, 48, 49, 50, 51, 52,
    53, 54, 55, 56, 57, 58,
    59, 60, 37, 38, 39, 40,

    66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77,
    78, 79, 80, 81, 82, 83,
    84, 85, 86, 87, 88, 89,
    90, 61, 62, 63, 64, 65,

    97, 98, 99, 100, 101, 102,
    103, 104, 105, 106, 107, 108,
    109, 110, 111, 112, 113, 114,
    115, 116, 117, 118, 119, 120,
    121, 122, 123, 124, 125, 126,
    91, 92, 93, 94, 95, 96,

    134, 135, 136, 137, 138, 139,
    140, 141, 142, 143, 144, 145,
    146, 147, 148, 149, 150, 151,
    152, 153, 154, 155, 156, 157,
    158, 159, 160, 161, 162, 163,
    164, 165, 166, 167, 168, 127,
    128, 129, 130, 131, 132, 133,

    177, 178, 179, 180, 181, 182,
    183, 184, 185, 186, 187, 188,
    189, 190, 191, 192, 193, 194,
    195, 196, 197, 198, 199, 200,
    201, 202, 203, 204, 205, 206,
    207, 208, 209, 210, 211, 212,
    213, 214, 215, 216, 169, 170,
    171, 172, 173, 174, 175, 176
];

export const minimumNumber = (a: number, b: number) => (a < b) ? a : b;
export const maximumNumber = (a: number, b: number) => (a > b) ? a : b;

// gotch patterns

export const coordSort = (a: ICoords, b: ICoords): number => a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0;

export const lightSortOnCoords = (a: Cell, b: Cell): number => coordSort(a.coords, b.coords);

export const patchSortOnCoords = (a: Patch, b: Patch): number => coordSort(a.coords, b.coords);

export const gotchSortOnNonces = (a: Gotch, b: Gotch): number => a.nonce < b.nonce ? -1 : a.nonce > b.nonce ? 1 : 0;

export const gotchWithMaxNonce = (gotches: Gotch[]) => gotches.reduce((withMax, adjacent) => {
    if (withMax) {
        return adjacent.nonce > withMax.nonce ? adjacent : withMax;
    } else {
        return adjacent;
    }
});

export const tokenWithMaxNonce = (tokens: Token[]) => tokens.reduce((withMax, adjacent) => {
    if (withMax) {
        return adjacent.nonce > withMax.nonce ? adjacent : withMax;
    } else {
        return adjacent;
    }
});

export const ringIndex = (coords: ICoords, origin: ICoords): number => {
    const ringCoords: ICoords = {x: coords.x - origin.x, y: coords.y - origin.y};
    for (let index = 1; index <= 6; index++) {
        if (ringCoords.x === TOKEN_SHAPE[index].x && ringCoords.y === TOKEN_SHAPE[index].y) {
            return index;
        }
    }
    return 0;
};

export const lightsToHexString = (cells: Cell[]) => {
    const lit = cells.map(cell => cell.lit ? '1' : '0');
    const nybbleStrings = lit.map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join('') : null).filter(chunk => chunk);
    const nybbleChars = nybbleStrings.map((s: string) => parseInt(padRightTo4(s), 2).toString(16));
    return nybbleChars.join('');
};

export const patchesToHexString = (patches: Patch[]) => {
    const lit = patches.map(cell => cell.lit ? '1' : '0');
    const nybbleStrings = lit.map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join('') : null).filter(chunk => chunk);
    const nybbleChars = nybbleStrings.map((s: string) => parseInt(padRightTo4(s), 2).toString(16));
    return nybbleChars.join('');
};

export const fingerprintToLights = (hexString: string, cells: Cell[]) => {
    const numbers = hexString.split('').map(hexChar => parseInt(hexChar, 16));
    const booleanArrays = numbers.map(nyb => {
        const b0 = (nyb & 8) !== 0;
        const b1 = (nyb & 4) !== 0;
        const b2 = (nyb & 2) !== 0;
        const b3 = (nyb & 1) !== 0;
        return [b0, b1, b2, b3];
    });
    const litStack = [].concat.apply([], booleanArrays).reverse();
    cells.forEach(cell => cell.lit = litStack.pop());
};

export const fingerprintToPatches = (hexString: string, patches: Patch[]) => {
    const numbers = hexString.split('').map(hexChar => parseInt(hexChar, 16));
    const booleanArrays = numbers.map(nyb => {
        const b0 = (nyb & 8) !== 0;
        const b1 = (nyb & 4) !== 0;
        const b2 = (nyb & 2) !== 0;
        const b3 = (nyb & 1) !== 0;
        return [b0, b1, b2, b3];
    });
    const litStack = [].concat.apply([], booleanArrays).reverse();
    patches.forEach(cell => cell.lit = litStack.pop());
};

// basics

export const zero: ICoords = {x: 0, y: 0};

export const minus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x - b.x, y: a.y - b.y};
};

export const plus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x + b.x, y: a.y + b.y};
};

export const equals = (a: ICoords, b: ICoords): boolean => a.x === b.x && a.y === b.y;

export const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + '0') : s;

// main view

export const createMainViewBox = (coordsList: ICoords[]): string => {
    const margin = 0.5;
    const minX = coordsList.map(p => p.x).reduce(minimumNumber);
    const minY = coordsList.map(p => p.y).reduce(minimumNumber);
    const maxX = coordsList.map(p => p.x).reduce(maximumNumber);
    const maxY = coordsList.map(p => p.y).reduce(maximumNumber);
    const x = minX * SCALE_X - margin;
    const y = minY * SCALE_Y - margin;
    const w = (maxX - minX) * SCALE_X + margin * 2;
    const h = (maxY - minY) * SCALE_Y + margin * 2;
    return `${x},${y},${w},${h}`;
};

export const createMainViewBoxAround = (center: ICoords): string => {
    const x = center.x * SCALE_X + ZOOM_VIEW_BOX.x;
    const y = center.y * SCALE_Y + ZOOM_VIEW_BOX.y;
    const w = ZOOM_VIEW_BOX.w;
    const h = ZOOM_VIEW_BOX.h;
    return `${x},${y},${w},${h}`;
};

export const getLightTransform = (coords: ICoords, text: boolean): string => {
    const x = coords.x * SCALE_X;
    const y = (coords.y + (text ? 0.12 : 0)) * SCALE_Y;
    const scale = SCALE * (text ? 0.1 : 1.1);
    return `translate(${x},${y}) scale(${scale})`;
};

export const getGotchTransform = (coords: ICoords): string => {
    const x = coords.x * SCALE_X;
    const y = coords.y * SCALE_Y;
    return `translate(${x},${y}) scale(${SCALE * SPREAD * 16.5}) rotate(30)`;
};

export const getListGotchTransform = (index: number): string => {
    return `translate(0.5,${0.5 + index * GOTCH_DISTANCE}) scale(${GOTCH_SCALE})`
};

export interface IGotchPattern {
    gotches: string;
    lights: string;
}

export const validGotchPattern = (pattern: IGotchPattern): boolean => {
    const gotchesOk = /^[0-8]*$/.test(pattern.gotches);
    const lightsOk = /^[0-9a-f]*$/.test(pattern.gotches);
    return gotchesOk && lightsOk;
};

export const tokenFromFingerprint = (fingerprint: string, index: number, ownerLookup: (fingerprint: string) => string): Token => {
    const gotch = new Token(undefined, {x: 0, y: 0}, TOKEN_SHAPE.map(c => new Cell(c)), index);
    fingerprintToLights(fingerprint, gotch.lights);
    gotch.owner = ownerLookup(fingerprint);
    return gotch;
};

export const gotchFromFingerprint = (fingerprint: string, index: number, ownerLookup: (fingerprint: string) => string): Gotch => {
    const gotch = new Gotch(undefined, {x: 0, y: 0}, TOKEN_SHAPE.map(c => new Patch(c)), index);
    fingerprintToPatches(fingerprint, gotch.patches);
    gotch.owner = ownerLookup(fingerprint);
    return gotch;
};

export interface ICoords {
    x: number;
    y: number;
}

