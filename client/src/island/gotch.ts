import {BRANCH_STEP, ERROR_STEP, GOTCH_SHAPE, STOP_STEP} from './shapes';
import {equals, ICoords, Spot} from './spot';
import {Gotchi} from '../gotchi/gotchi';
import {Genome} from '../genetics/genome';
import {IFabricFactory} from '../body/fabric';
import {INITIAL_JOINT_COUNT} from '../gotchi/population';

const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + '0') : s;

interface IGotchIndexed {
    gotch: Gotch;
    index: number;
}

const spotsToHexFingerprint = (spots: Spot[]) => {
    const lit = spots.map(spot => spot.land ? '1' : '0');
    const nybbleStrings = lit.map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join('') : null).filter(chunk => chunk);
    const nybbleChars = nybbleStrings.map((s: string) => parseInt(padRightTo4(s), 2).toString(16));
    return nybbleChars.join('');
};

const ringIndex = (coords: ICoords, origin: ICoords): number => {
    const ringCoords: ICoords = {x: coords.x - origin.x, y: coords.y - origin.y};
    for (let index = 1; index <= 6; index++) {
        if (ringCoords.x === GOTCH_SHAPE[index].x && ringCoords.y === GOTCH_SHAPE[index].y) {
            return index;
        }
    }
    return 0;
};

export const gotchTreeString = (gotches: Gotch[]) => {
    const root = gotches.find(gotch => gotch.nonce === 0);
    if (!root) {
        console.error('No root gotch found');
        return '';
    }
    gotches.forEach(gotch => gotch.visited = false);
    return root.generateOctalTreePattern([]).join('');
};

export class Gotch {
    public genome?: Genome;
    public gotchi?: Gotchi;
    public nonce = 0;
    public visited = false;
    public childGotches: Gotch[] = [];

    constructor(private fabricFactory: IFabricFactory, public parentGotch: Gotch | undefined,
                public coords: ICoords,
                public spots: Spot[]) {
        this.spots[0].centerOfGotch = this;
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.spots[neighbor].adjacentGotches.push(this);
        }
        this.spots.forEach(p => p.memberOfGotch.push(this));
        if (parentGotch) {
            parentGotch.childGotches.push(this);
            this.nonce = parentGotch.nonce + 1;
        }
    }

    public triggerBirth(gotchiCreated?: (gotchi: Gotchi) => void) {
        const genome = this.genome;
        if (genome) {
            this.fabricFactory
                .createBodyAt(this.coords.x, this.coords.y, INITIAL_JOINT_COUNT)
                .then(fabric => {
                    this.gotchi = new Gotchi(fabric, genome);
                    if (gotchiCreated) {
                        gotchiCreated(this.gotchi);
                    }
                });
        }
    }

    get center(): Spot {
        return this.spots[0];
    }

    get canBePurchased(): boolean {
        const noneAdjacent = this.center.adjacentGotches.length === 0;
        const occupiedAdjacentExists = !!this.center.adjacentGotches.find(gotch => !!gotch.gotchi);
        const vacant = !this.gotchi;
        return (noneAdjacent || occupiedAdjacentExists) && vacant;
    }

    public destroy(): Spot[] {
        if (this.spots.length === 0) {
            return [];
        }
        if (this.parentGotch) {
            this.parentGotch.childGotches = this.parentGotch.childGotches.filter(gotch => !equals(this.coords, gotch.coords));
        }
        this.spots[0].centerOfGotch = undefined;
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.spots[neighbor].adjacentGotches = this.spots[neighbor].adjacentGotches.filter(gotch => !equals(this.coords, gotch.coords));
        }
        this.spots.forEach(p => p.memberOfGotch = p.memberOfGotch.filter(gotch => !equals(this.coords, gotch.coords)));
        const lightsToRemove = this.spots.filter(p => p.memberOfGotch.length === 0);
        this.spots = [];
        return lightsToRemove;
    }

    public createFingerprint() {
        return spotsToHexFingerprint(this.spots);
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

// export const fingerprintToSpots = (hexString: string, spots: Spot[]) => {
//     const numbers = hexString.split('').map(hexChar => parseInt(hexChar, 16));
//     const booleanArrays = numbers.map(nyb => {
//         const b0 = (nyb & 8) !== 0;
//         const b1 = (nyb & 4) !== 0;
//         const b2 = (nyb & 2) !== 0;
//         const b3 = (nyb & 1) !== 0;
//         return [b0, b1, b2, b3];
//     });
//     const landStack = [].concat.apply([], booleanArrays).reverse();
//     spots.forEach(spot => spot.land = landStack.pop());
// };
//
// export const gotchFromFingerprint = (fingerprint: string, index: number, gotchMasterLookup: (fingerprint: string) => string): Gotch => {
//     const gotch = new Gotch(undefined, {x: 0, y: 0}, GOTCH_SHAPE.map(c => new Spot(c)));
//     fingerprintToSpots(fingerprint, gotch.spots);
//     return gotch;
// };
