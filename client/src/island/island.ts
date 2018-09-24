import {Raycaster, Vector3} from 'three';
import {Gotch} from './gotch';
import {
    BRANCH_STEP,
    equals,
    GOTCH_SHAPE,
    gotchWithMaxNonce,
    ICoords,
    IslandPattern,
    padRightTo4,
    plus,
    sortSpotsOnCoord,
    STOP_STEP,
    zero
} from './constants';
import {Spot} from './spot';

export class Island {
    public spots: Spot[] = [];
    public gotches: Gotch[] = [];
    public freeGotches: Gotch[] = [];
    public facesMeshNode: any;
    private ownershipCache: Map<string, string>;

    constructor(pattern: IslandPattern) {
        this.apply(pattern);
        if (!this.spots.length) {
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
                        gotch = this.gotchAroundSpot(gotch.spots[step]);
                    }
                    break;
                default:
                    console.error('Error step');
            }
        }
        const hexChars = pattern.spots ? pattern.spots.split('') : [];
        const numbers = hexChars.map(hexChar => parseInt(hexChar, 16));
        const booleanArrays = numbers.map(nyb => {
            const b0 = (nyb & 8) !== 0;
            const b1 = (nyb & 4) !== 0;
            const b2 = (nyb & 2) !== 0;
            const b3 = (nyb & 1) !== 0;
            return [b0, b1, b2, b3];
        });
        const litStack = [].concat.apply([], booleanArrays).reverse();
        this.spots.sort(sortSpotsOnCoord).forEach(spot => spot.lit = litStack.pop());
        this.refreshOwnership();
    }

    public get midpoint(): Vector3 {
        return this.spots
            .reduce(
                (sum: Vector3, spot: Spot) => {
                    sum.x += spot.scaledCoords.x;
                    sum.z += spot.scaledCoords.y;
                    return sum;
                },
                new Vector3()
            )
            .multiplyScalar(1 / this.spots.length);
    }

    public findSpot(raycaster: Raycaster): Spot | undefined {
        const intersections = raycaster.intersectObject(this.facesMeshNode);
        if (intersections.length > 1) {
            console.error('Expected only one');
            return undefined;
        }
        const hit = intersections[0].faceIndex;
        if (hit === undefined) {
            return undefined;
        }
        return this.spots.find(spot => spot.faceIndexes.indexOf(hit) >= 0);
    }

    public get pattern(): IslandPattern {
        return {gotches: this.gotchTree, spots: this.spotString};
    }

    // ================================================================================================

    private get spotString(): string {
        const lit = this.spots.map(spot => spot.lit ? '1' : '0');
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
        this.spots.forEach(cell => cell.updateFreeFlag());
    }

    private gotchAroundSpot(spot: Spot): Gotch {
        const adjacentMaxNonce = gotchWithMaxNonce(spot.adjacentGotches);
        return this.getOrCreateGotch(adjacentMaxNonce, spot.coords);
    }

    private getOrCreateGotch(parent: Gotch | undefined, coords: ICoords): Gotch {
        const existing = this.gotches.find(existingGotch => equals(existingGotch.coords, coords));
        if (existing) {
            return existing;
        }
        const cells = GOTCH_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)));
        const gotch = new Gotch(parent, coords, cells, -1);
        this.gotches.push(gotch);
        return gotch;
    }

    private getOrCreateSpot(coords: ICoords): Spot {
        const existing = this.spots.find(p => equals(p.coords, coords));
        if (existing) {
            return existing;
        }
        const spot = new Spot(coords);
        this.spots.push(spot);
        return spot;
    }
}