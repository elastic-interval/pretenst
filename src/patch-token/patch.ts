import {Cell} from './cell';
import {
    BRANCH_STEP,
    createMainViewBox,
    equals,
    ICoords,
    IPatchPattern,
    lightSortOnCoords,
    lightsToHexString,
    PATCH_TOKEN_SHAPE,
    plus,
    STOP_STEP,
    withMaxNonce,
    zero
} from './constants';
import {PatchToken} from './patch-token';

export class Patch {
    public mainViewBox: string;
    public cells: Cell[] = [];
    public tokens: PatchToken[] = [];
    public freeTokens: PatchToken[] = [];

    constructor(private ownerLookup: (fingerprint: string) => string) {
        if (!this.cells.length) {
            this.getOrCreatePatchToken(undefined, zero);
        }
        this.refreshOwnership();
        this.refreshViewBox();
    }

    public apply(pattern: IPatchPattern) {
        let token: PatchToken | undefined = this.getOrCreatePatchToken(undefined, zero);
        const stepStack = pattern.patches.split('').reverse().map(stepChar => Number(stepChar));
        const tokenStack: PatchToken[] = [];
        while (stepStack.length > 0) {
            const step = stepStack.pop();
            switch (step) {
                case STOP_STEP:
                    token = tokenStack.pop();
                    break;
                case BRANCH_STEP:
                    if (token) {
                        tokenStack.push(token);
                    }
                    break;
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    if (token) {
                        token = this.tokenAroundCell(token.lights[step]);
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
        this.cells.sort(lightSortOnCoords).forEach(cell => cell.lit = litStack.pop());
        this.refreshOwnership();
        this.refreshViewBox();
    }

    get isSingleToken(): boolean {
        return this.tokens.length === 1;
    }

    public get dumbClone(): Patch {
        const patch = new Patch(this.ownerLookup);
        patch.mainViewBox = this.mainViewBox;
        patch.tokens = this.tokens.slice();
        patch.cells = this.cells.slice();
        patch.refreshOwnership();
        return patch;
    }

    public withoutFreeTokens(): Patch {
        const patch = this.dumbClone;
        patch.tokens.filter(token => !token.owner).forEach(token => token.destroy().forEach(lightToRemove => {
            patch.cells = patch.cells.filter(cell => !equals(lightToRemove.coords, cell.coords));
        }));
        patch.tokens = patch.tokens.filter(token => token.owner);
        patch.refreshOwnership();
        patch.refreshViewBox();
        return patch;
    }

    public withTokenAroundCell(cell: Cell): Patch {
        const patch = this.dumbClone;
        patch.tokenAroundCell(cell);
        patch.refreshOwnership();
        patch.refreshViewBox();
        return patch;
    }

    public get pattern(): IPatchPattern {
        const rootToken: PatchToken | undefined = this.tokens.find(token => token.nonce === 0);
        this.tokens.forEach(token => token.visited = false);
        const patches = rootToken ? rootToken.generateOctalTreePattern([]).join('') : '0';
        const lights = lightsToHexString(this.cells.slice().sort(lightSortOnCoords));
        return {patches, lights};
    }

    // private ===

    private refreshOwnership() {
        this.tokens.forEach(token => token.owner = this.ownerLookup(token.createFingerprint()));
        this.freeTokens = this.tokens.filter(token => !token.owner);
        this.cells.forEach(cell => cell.updateFreeFlag());
    }

    private tokenAroundCell(cell: Cell): PatchToken {
        const adjacentMaxNonce = withMaxNonce(cell.adjacentTokens);
        return this.getOrCreatePatchToken(adjacentMaxNonce, cell.coords);
    }

    private refreshViewBox() {
        if (this.cells.length === 0) {
            return '-1,-1,2,2';
        }
        this.mainViewBox = createMainViewBox(this.cells.map(p => p.coords));
        return this.mainViewBox;
    }

    private getOrCreatePatchToken(parent: PatchToken | undefined, coords: ICoords): PatchToken {
        const existing = this.tokens.find(token => equals(token.coords, coords));
        if (existing) {
            return existing;
        }
        const lights = PATCH_TOKEN_SHAPE.map(c => this.getOrCreateLight(plus(c, coords)));
        const patchToken = new PatchToken(parent, coords, lights, -1);
        this.tokens.push(patchToken);
        return patchToken;
    }

    private getOrCreateLight(coords: ICoords): Cell {
        const existing = this.cells.find(p => equals(p.coords, coords));
        if (existing) {
            return existing;
        }
        const cell = new Cell(coords);
        this.cells.push(cell);
        return cell;
    }
}