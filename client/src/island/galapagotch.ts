import {Color, Face3, Geometry, Vector3} from 'three';
import {Gotch} from './gotch';
import {
    BRANCH_STEP,
    equals,
    gotchWithMaxNonce,
    ICoords,
    IGotchPattern,
    patchSortOnCoords,
    plus,
    STOP_STEP,
    TOKEN_SHAPE,
    zero
} from './constants';
import {Patch} from './patch';

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

export class Galapagotch {

    public patches: Patch[] = [];
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
        if (!this.patches.length) {
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
                        gotch = this.gotchAroundPatch(gotch.patches[step]);
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
        this.patches.sort(patchSortOnCoords).forEach(patch => patch.lit = litStack.pop());
        this.refreshOwnership();
    }

    public get geometry(): Geometry {
        const faces: Face3[] = [];
        const vertices: Vector3[] = [];
        const transform = new Vector3();
        this.patches.forEach((patch, patchIndex) => {
            const color = patch.lit ? LIT_COLOR : UNLIT_COLOR;
            transform.x = patch.coords.x * SCALEX;
            transform.y = patch.centerOfGotch ? 0.1 : 0;
            transform.z = patch.coords.y * SCALEY;
            vertices.push(...HEXAGON_POINTS.map(vertex => new Vector3().addVectors(vertex, transform)));
            for (let a = 0; a < SIX; a++) {
                const offset = patchIndex * HEXAGON_POINTS.length;
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
        this.patches.forEach(cell => cell.updateFreeFlag());
    }

    private gotchAroundPatch(patch: Patch): Gotch {
        const adjacentMaxNonce = gotchWithMaxNonce(patch.adjacentGotches);
        return this.getOrCreateGotch(adjacentMaxNonce, patch.coords);
    }

    private getOrCreateGotch(parent: Gotch | undefined, coords: ICoords): Gotch {
        const existing = this.gotches.find(existingGotch => equals(existingGotch.coords, coords));
        if (existing) {
            return existing;
        }
        const cells = TOKEN_SHAPE.map(c => this.getOrCreatePatch(plus(c, coords)));
        const gotch = new Gotch(parent, coords, cells, -1);
        this.gotches.push(gotch);
        return gotch;
    }

    private getOrCreatePatch(coords: ICoords): Patch {
        const existing = this.patches.find(p => equals(p.coords, coords));
        if (existing) {
            return existing;
        }
        const patch = new Patch(coords);
        this.patches.push(patch);
        return patch;
    }
}