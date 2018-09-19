import {Cell} from './cell';
import {
    BRANCH_STEP,
    createMainViewBox,
    equals,
    ICoords,
    IGotchPattern,
    lightSortOnCoords,
    lightsToHexString,
    plus,
    STOP_STEP,
    TOKEN_SHAPE,
    tokenWithMaxNonce,
    zero
} from './constants';
import {Token} from './token';

export class Island {
    public mainViewBox: string;
    public cells: Cell[] = [];
    public tokens: Token[] = [];
    public freeTokens: Token[] = [];

    constructor(private ownerLookup: (fingerprint: string) => string) {
        if (!this.cells.length) {
            this.getOrCreateToken(undefined, zero);
        }
        this.refreshOwnership();
        this.refreshViewBox();
    }

    public apply(pattern: IGotchPattern) {
        let token: Token | undefined = this.getOrCreateToken(undefined, zero);
        const stepStack = pattern.gotches.split('').reverse().map(stepChar => Number(stepChar));
        const tokenStack: Token[] = [];
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

    public get dumbClone(): Island {
        const island = new Island(this.ownerLookup);
        island.mainViewBox = this.mainViewBox;
        island.tokens = this.tokens.slice();
        island.cells = this.cells.slice();
        island.refreshOwnership();
        return island;
    }

    public withoutFreeGotches(): Island {
        const island = this.dumbClone;
        island.tokens.filter(token => !token.owner).forEach(token => token.destroy().forEach(lightToRemove => {
            island.cells = island.cells.filter(cell => !equals(lightToRemove.coords, cell.coords));
        }));
        island.tokens = island.tokens.filter(token => token.owner);
        island.refreshOwnership();
        island.refreshViewBox();
        return island;
    }

    public withTokenAroundCell(cell: Cell): Island {
        const token = this.dumbClone;
        token.tokenAroundCell(cell);
        token.refreshOwnership();
        token.refreshViewBox();
        return token;
    }

    public get pattern(): IGotchPattern {
        const rootToken: Token | undefined = this.tokens.find(token => token.nonce === 0);
        this.tokens.forEach(token => token.visited = false);
        const gotches = rootToken ? rootToken.generateOctalTreePattern([]).join('') : '0';
        const lights = lightsToHexString(this.cells.slice().sort(lightSortOnCoords));
        return {gotches, lights};
    }

    // private ===

    private refreshOwnership() {
        this.tokens.forEach(token => token.owner = this.ownerLookup(token.createFingerprint()));
        this.freeTokens = this.tokens.filter(token => !token.owner);
        this.cells.forEach(cell => cell.updateFreeFlag());
    }

    private tokenAroundCell(cell: Cell): Token {
        const adjacentMaxNonce = tokenWithMaxNonce(cell.adjacentTokens);
        return this.getOrCreateToken(adjacentMaxNonce, cell.coords);
    }

    private refreshViewBox() {
        if (this.cells.length === 0) {
            return '-1,-1,2,2';
        }
        this.mainViewBox = createMainViewBox(this.cells.map(p => p.coords));
        return this.mainViewBox;
    }

    private getOrCreateToken(parent: Token | undefined, coords: ICoords): Token {
        const existing = this.tokens.find(existingToken => equals(existingToken.coords, coords));
        if (existing) {
            return existing;
        }
        const cells = TOKEN_SHAPE.map(c => this.getOrCreateCell(plus(c, coords)));
        const token = new Token(parent, coords, cells, -1);
        this.tokens.push(token);
        return token;
    }

    private getOrCreateCell(coords: ICoords): Cell {
        const existing = this.cells.find(p => equals(p.coords, coords));
        if (existing) {
            return existing;
        }
        const cell = new Cell(coords);
        this.cells.push(cell);
        return cell;
    }
}