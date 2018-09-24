import {Raycaster, Vector3} from 'three';
import {Gotch} from './gotch';
import {
    BRANCH_STEP,
    equals,
    gotchWithMaxNonce,
    ICoords,
    IslandPattern,
    padRightTo4,
    plus,
    STOP_STEP,
    tileSortOnCoords,
    TOKEN_SHAPE,
    zero
} from './constants';
import {Tile} from './tile';

export class Island {
    public tiles: Tile[] = [];
    public gotches: Gotch[] = [];
    public freeGotches: Gotch[] = [];
    public facesMeshNode: any;
    private ownershipCache: Map<string, string>;

    constructor(pattern: IslandPattern) {
        this.apply(pattern);
        if (!this.tiles.length) {
            this.getOrCreateGotch(undefined, zero);
        }
        this.refreshOwnership();
    }

    public apply(pattern: IslandPattern) {
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
        const numbers = pattern.tiles.split('').map(hexChar => parseInt(hexChar, 16));
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

    public get midpoint(): Vector3 {
        return this.tiles
            .reduce(
                (sum: Vector3, tile: Tile) => {
                    sum.x += tile.scaledCoords.x;
                    sum.z += tile.scaledCoords.y;
                    return sum;
                },
                new Vector3()
            )
            .multiplyScalar(1 / this.tiles.length);
    }

    public findTile(raycaster: Raycaster): Tile | undefined {
        const intersections = raycaster.intersectObject(this.facesMeshNode);
        if (intersections.length > 1) {
            console.error('Expected only one');
            return undefined;
        }
        const hit = intersections[0].faceIndex;
        if (hit === undefined) {
            return undefined;
        }
        return this.tiles.find(tile => tile.faceIndexes.indexOf(hit) >= 0);
    }

    public get pattern(): IslandPattern {
        return {gotches: this.gotchTree, tiles: this.tileString};
    }

    // ================================================================================================

    private get tileString(): string {
        const lit = this.tiles.map(tile => tile.lit ? '1' : '0');
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

    private get gotchTree(): string {
        const root = this.gotches.find(gotch => gotch.nonce === 0);
        if (!root) {
            console.error('No root gotch found');
            return '0';
        }
        this.gotches.forEach(gotch => gotch.visited = false);
        return root.generateOctalTreePattern([]).join('');
    }

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