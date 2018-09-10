import {Cell} from './cell';
import {
    BRANCH_STEP,
    createMainViewBox,
    equals,
    GOTCH_SHAPE,
    ICoords,
    IGotchPattern,
    lightSortOnCoords,
    lightsToHexString,
    plus,
    STOP_STEP,
    withMaxNonce,
    zero
} from './constants';
import {Gotch} from './gotch';

export class Island {
    public mainViewBox: string;
    public cells: Cell[] = [];
    public gotches: Gotch[] = [];
    public freeGotches: Gotch[] = [];

    constructor(private ownerLookup: (fingerprint: string) => string) {
        if (!this.cells.length) {
            this.getOrCreateGotch(undefined, zero);
        }
        this.refreshOwnership();
        this.refreshViewBox();
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
                        gotch = this.gotchAroundCell(gotch.lights[step]);
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

    get isSingleGotch(): boolean {
        return this.gotches.length === 1;
    }

    public get dumbClone(): Island {
        const island = new Island(this.ownerLookup);
        island.mainViewBox = this.mainViewBox;
        island.gotches = this.gotches.slice();
        island.cells = this.cells.slice();
        island.refreshOwnership();
        return island;
    }

    public withoutFreeGotches(): Island {
        const island = this.dumbClone;
        island.gotches.filter(gotch => !gotch.owner).forEach(gotch => gotch.destroy().forEach(lightToRemove => {
            island.cells = island.cells.filter(cell => !equals(lightToRemove.coords, cell.coords));
        }));
        island.gotches = island.gotches.filter(gotch => gotch.owner);
        island.refreshOwnership();
        island.refreshViewBox();
        return island;
    }

    public withGotchAroundCell(cell: Cell): Island {
        const gotch = this.dumbClone;
        gotch.gotchAroundCell(cell);
        gotch.refreshOwnership();
        gotch.refreshViewBox();
        return gotch;
    }

    public get pattern(): IGotchPattern {
        const rootGotch: Gotch | undefined = this.gotches.find(gotch => gotch.nonce === 0);
        this.gotches.forEach(gotch => gotch.visited = false);
        const gotches = rootGotch ? rootGotch.generateOctalTreePattern([]).join('') : '0';
        const lights = lightsToHexString(this.cells.slice().sort(lightSortOnCoords));
        return {gotches, lights};
    }

    // private ===

    private refreshOwnership() {
        this.gotches.forEach(gotch => gotch.owner = this.ownerLookup(gotch.createFingerprint()));
        this.freeGotches = this.gotches.filter(gotch => !gotch.owner);
        this.cells.forEach(cell => cell.updateFreeFlag());
    }

    private gotchAroundCell(cell: Cell): Gotch {
        const adjacentMaxNonce = withMaxNonce(cell.adjacentGotches);
        return this.getOrCreateGotch(adjacentMaxNonce, cell.coords);
    }

    private refreshViewBox() {
        if (this.cells.length === 0) {
            return '-1,-1,2,2';
        }
        this.mainViewBox = createMainViewBox(this.cells.map(p => p.coords));
        return this.mainViewBox;
    }

    private getOrCreateGotch(parent: Gotch | undefined, coords: ICoords): Gotch {
        const existing = this.gotches.find(existingGotch => equals(existingGotch.coords, coords));
        if (existing) {
            return existing;
        }
        const cells = GOTCH_SHAPE.map(c => this.getOrCreateCell(plus(c, coords)));
        const gotch = new Gotch(parent, coords, cells, -1);
        this.gotches.push(gotch);
        return gotch;
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