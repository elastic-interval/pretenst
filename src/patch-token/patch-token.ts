import {
    BRANCH_STEP,
    equals,
    ERROR_STEP,
    getListTokenTransform,
    getPatchTokenTransform,
    ICoords,
    lightsToHexString,
    ringIndex,
    STOP_STEP
} from './constants';
import {Cell} from './cell';

export class PatchToken {
    public owner: string;
    public nonce = 0;
    public visited = false;
    public childTokens: PatchToken[] = [];
    public transform: string;

    constructor(public parentToken: PatchToken | undefined,
                public coords: ICoords,
                public lights: Cell[],
                index: number) {
        this.lights[0].centerOfToken = this;
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.lights[neighbor].adjacentTokens.push(this);
        }
        this.lights.forEach(p => p.memberOfToken.push(this));
        if (parentToken) {
            parentToken.childTokens.push(this);
            this.nonce = parentToken.nonce + 1;
        }
        this.transform = index < 0 ? getPatchTokenTransform(coords) : getListTokenTransform(index);
    }

    get canBePurchased(): boolean {
        const center = this.lights[0];
        const noneAdjacent = center.adjacentTokens.length === 0;
        const ownedAdjacentExists = !!center.adjacentTokens.find(token => !!token.owner);
        const notOwned = !this.owner;
        return (noneAdjacent || ownedAdjacentExists) && notOwned;
    }

    // get rotated(): PatchToken {
    //   return new PatchToken(
    //     this.parentToken, this.coords,
    //     this.cells.map((p: Cell, index: number, lookup: Array<Cell>) => lookup[ROTATE[index]]),
    //     this.ownerLookup
    //   );
    // }

    public destroy(): Cell[] {
        if (this.lights.length === 0) {
            return [];
        }
        if (this.parentToken) {
            this.parentToken.childTokens = this.parentToken.childTokens.filter(token => !equals(this.coords, token.coords));
        }
        this.lights[0].centerOfToken = undefined;
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.lights[neighbor].adjacentTokens = this.lights[neighbor].adjacentTokens.filter(token => !equals(this.coords, token.coords));
        }
        this.lights.forEach(p => p.memberOfToken = p.memberOfToken.filter(token => !equals(this.coords, token.coords)));
        const lightsToRemove = this.lights.filter(p => p.memberOfToken.length === 0);
        this.lights = [];
        return lightsToRemove;
    }

    public createFingerprint() {
        return lightsToHexString(this.lights);
    }

    public generateOctalTreePattern(steps: number[]): number[] {
        const remainingChildren = this.childTokens.filter(token => !token.visited)
            .map(token => [ringIndex(token.coords, this.coords), token])
            .sort((a, b) => a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0);
        if (remainingChildren.length > 0) {
            while (remainingChildren.length > 0) {
                const child = remainingChildren.pop();
                if (child) {
                    const childToken = child[1] as PatchToken;
                    const index = child[0] as number;
                    if (remainingChildren.length > 0) {
                        steps.push(BRANCH_STEP);
                    }
                    steps.push(index > 0 ? index : ERROR_STEP);
                    childToken.generateOctalTreePattern(steps);
                }
            }
        }
        else {
            steps.push(STOP_STEP);
        }
        this.visited = true;
        return steps;
    }
}

