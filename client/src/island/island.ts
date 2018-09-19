import {Color, Face3, Geometry, Vector3} from 'three';
import {Gotch} from './gotch';
import {
    BRANCH_STEP,
    equals,
    gotchWithMaxNonce,
    ICoords,
    IGotchPattern,
    plus,
    STOP_STEP,
    tileSortOnCoords,
    TOKEN_SHAPE,
    zero
} from './constants';
import {Tile} from './tile';

const NORMAL_SPREAD = 0.2;
const UP = new Vector3(0, 1, 0);
const SIX = 6;
const SCALEX = 0.866;
const SCALEY = 1.5;
export const HEXAGON_POINTS = [
    new Vector3(0, 0, -1),
    new Vector3(-0.866, 0, -0.5),
    new Vector3(-0.866, 0, 0.5),
    new Vector3(0, 0, 1),
    new Vector3(0.866, 0, 0.5),
    new Vector3(0.866, 0, -0.5),
    new Vector3()
];
const LIT_COLOR = new Color(1, 1, 0.6);
const UNLIT_COLOR = new Color(0.5, 0.5, 0.5);

export class Island {

    public tiles: Tile[] = [];
    public gotches: Gotch[] = [];
    public freeGotches: Gotch[] = [];
    private privateGeometry?: Geometry;
    private ownershipCache: Map<string, string>;

    constructor() {
        const existingOwner = localStorage.getItem('owner');
        const owner = existingOwner ? existingOwner : 'gumby';
        const existingPattern = localStorage.getItem(owner);
        const pattern: IGotchPattern = existingPattern ? JSON.parse(existingPattern) : {gotches: '0', lights: '0'};
        this.apply(pattern);
        if (!this.tiles.length) {
            this.getOrCreateGotch(undefined, zero);
        }
        this.refreshOwnership();
    }

    public apply(pattern: IGotchPattern) {
        let gotch: Gotch | undefined = this.getOrCreateGotch(undefined, zero);
        const stepStack = pattern.gotches.split('').reverse().map(stepChar => Number(stepChar));
        const gotchStack: Gotch[] = [];
        while (stepStack.length > 0) {
            const step = stepStack.pop();
            switch (step) {
                case STOP_STEP:
                    gotch = gotchStack.pop();
                    break;
                case BRANCH_STEP:
                    if (gotch) {
                        gotchStack.push(gotch);
                    }
                    break;
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    if (gotch) {
                        gotch = this.gotchAroundTile(gotch.tiles[step]);
                    }
                    break;
                default:
                    console.error('Error step');
            }
        }
        const numbers = pattern.lights.split('').map(hexChar => parseInt(hexChar, 16));
        const booleanArrays = numbers.map(nyb => {
            const b0 = (nyb & 8) !== 0;
            const b1 = (nyb & 4) !== 0;
            const b2 = (nyb & 2) !== 0;
            const b3 = (nyb & 1) !== 0;
            return [b0, b1, b2, b3];
        });
        const litStack = [].concat.apply([], booleanArrays).reverse();
        this.tiles.sort(tileSortOnCoords).forEach(tile => tile.lit = litStack.pop());
        this.refreshOwnership();
    }

    public get geometry(): Geometry {
        const faces: Face3[] = [];
        const vertices: Vector3[] = [];
        const transform = new Vector3();
        this.tiles.forEach((tile, tileIndex) => {
            const color = tile.lit ? LIT_COLOR : UNLIT_COLOR;
            transform.x = tile.coords.x * SCALEX;
            // transform.y = tile.centerOfGotch ? 0.1 : 0;
            transform.z = tile.coords.y * SCALEY;
            vertices.push(...HEXAGON_POINTS.map(vertex => new Vector3().addVectors(vertex, transform)));
            for (let a = 0; a < SIX; a++) {
                const offset = tileIndex * HEXAGON_POINTS.length;
                const b = (a + 1) % SIX;
                faces.push(new Face3(
                    offset + SIX, offset + a, offset + b,
                    [
                        UP,
                        new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], NORMAL_SPREAD).normalize(),
                        new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], NORMAL_SPREAD).normalize()
                    ],
                    color
                ));
            }
        });
        if (this.privateGeometry) {
            this.privateGeometry.dispose();
            this.privateGeometry = undefined;
        }
        if (!this.privateGeometry) {
            this.privateGeometry = new Geometry();
            this.privateGeometry.vertices = vertices;
            this.privateGeometry.faces = faces;
            this.privateGeometry.computeBoundingSphere();
        }
        return this.privateGeometry;
    }

    // ================================================================================================

    private get owns(): Map<string, string> {
        if (!this.ownershipCache) {
            const ownership = localStorage.getItem('ownership');
            this.ownershipCache = ownership ? JSON.parse(ownership) : new Map<string, string>();
        }
        return this.ownershipCache;
    }

    private ownerLookup = (fingerprint: string) => this.owns[fingerprint];

    private refreshOwnership() {
        this.gotches.forEach(gotch => gotch.owner = this.ownerLookup(gotch.createFingerprint()));
        this.freeGotches = this.gotches.filter(gotch => !gotch.owner);
        this.tiles.forEach(cell => cell.updateFreeFlag());
    }

    private gotchAroundTile(tile: Tile): Gotch {
        const adjacentMaxNonce = gotchWithMaxNonce(tile.adjacentGotches);
        return this.getOrCreateGotch(adjacentMaxNonce, tile.coords);
    }

    private getOrCreateGotch(parent: Gotch | undefined, coords: ICoords): Gotch {
        const existing = this.gotches.find(existingGotch => equals(existingGotch.coords, coords));
        if (existing) {
            return existing;
        }
        const cells = TOKEN_SHAPE.map(c => this.getOrCreateTile(plus(c, coords)));
        const gotch = new Gotch(parent, coords, cells, -1);
        this.gotches.push(gotch);
        return gotch;
    }

    private getOrCreateTile(coords: ICoords): Tile {
        const existing = this.tiles.find(p => equals(p.coords, coords));
        if (existing) {
            return existing;
        }
        const tile = new Tile(coords);
        this.tiles.push(tile);
        return tile;
    }
}