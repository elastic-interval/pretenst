import {BRANCH_STEP, equals, ERROR_STEP, ICoords, ringIndex, STOP_STEP, tilesToHexString} from './constants';
import {Tile} from './tile';

interface IGotchIndexed {
    gotch: Gotch;
    index: number;
}

export class Gotch {
    public owner: string;
    public nonce = 0;
    public visited = false;
    public childGotches: Gotch[] = [];

    constructor(public parentGotch: Gotch | undefined,
                public coords: ICoords,
                public tiles: Tile[],
                index: number) {
        this.tiles[0].centerOfGotch = this;
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.tiles[neighbor].adjacentGotches.push(this);
        }
        this.tiles.forEach(p => p.memberOfGotch.push(this));
        if (parentGotch) {
            parentGotch.childGotches.push(this);
            this.nonce = parentGotch.nonce + 1;
        }
    }

    get canBePurchased(): boolean {
        const center = this.tiles[0];
        const noneAdjacent = center.adjacentGotches.length === 0;
        const ownedAdjacentExists = !!center.adjacentGotches.find(gotch => !!gotch.owner);
        const notOwned = !this.owner;
        return (noneAdjacent || ownedAdjacentExists) && notOwned;
    }

    // get rotated(): Gotch {
    //   return new Gotch(
    //     this.parentGotch, this.coords,
    //     this.cells.map((p: Cell, index: number, lookup: Array<Cell>) => lookup[ROTATE[index]]),
    //     this.ownerLookup
    //   );
    // }

    public destroy(): Tile[] {
        if (this.tiles.length === 0) {
            return [];
        }
        if (this.parentGotch) {
            this.parentGotch.childGotches = this.parentGotch.childGotches.filter(gotch => !equals(this.coords, gotch.coords));
        }
        this.tiles[0].centerOfGotch = undefined;
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.tiles[neighbor].adjacentGotches = this.tiles[neighbor].adjacentGotches.filter(gotch => !equals(this.coords, gotch.coords));
        }
        this.tiles.forEach(p => p.memberOfGotch = p.memberOfGotch.filter(gotch => !equals(this.coords, gotch.coords)));
        const lightsToRemove = this.tiles.filter(p => p.memberOfGotch.length === 0);
        this.tiles = [];
        return lightsToRemove;
    }

    public createFingerprint() {
        return tilesToHexString(this.tiles);
    }

    public generateOctalTreePattern(steps: number[]): number[] {
        const remainingChildren = this.childGotches.filter(gotch => !gotch.visited)
            .map(gotch => {
                const index = ringIndex(gotch.coords, this.coords);
                return {index, gotch} as IGotchIndexed;
            })
            .sort((a, b) => a.index < b.index ? 1 : a.index > b.index ? -1 : 0);
        if (remainingChildren.length > 0) {
            for (let child = remainingChildren.pop(); child; child = remainingChildren.pop()) {
                if (remainingChildren.length > 0) {
                    steps.push(BRANCH_STEP);
                }
                steps.push(child.index > 0 ? child.index : ERROR_STEP);
                child.gotch.generateOctalTreePattern(steps);
            }
        }
        else {
            steps.push(STOP_STEP);
        }
        this.visited = true;
        return steps;
    }
}

