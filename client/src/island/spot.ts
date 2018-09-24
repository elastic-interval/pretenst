import {ICoords} from './constants';
import {Gotch} from './gotch';

const SCALEX = 8.66;
const SCALEY = 15;

export class Spot {
    public scaledCoords: ICoords;
    public lit = false;
    public free = false;
    public memberOfGotch: Gotch[] = [];
    public adjacentGotches: Gotch[] = [];
    public centerOfGotch?: Gotch;
    public faceIndexes: number[] = [];

    constructor(public coords: ICoords) {
        this.scaledCoords = {x: coords.x * SCALEX, y: coords.y * SCALEY};
    }

    get canBeNewGotch(): boolean {
        return !this.centerOfGotch && this.adjacentGotches.length > 0;
    }

    public updateFreeFlag() {
        this.free = !this.memberOfGotch.find(gotch => !!gotch.owner);
    }
}