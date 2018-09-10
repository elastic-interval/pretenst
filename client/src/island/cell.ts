import {getLightTransform, ICoords} from './constants';
import {Gotch} from './gotch';

export class Cell {
    public lit = false;
    public free = false;
    public transform: string;
    public textTransform: string;
    public memberOfGotch: Gotch[] = [];
    public adjacentGotches: Gotch[] = [];
    public centerOfGotch?: Gotch;

    constructor(public coords: ICoords) {
        this.transform = getLightTransform(coords, false);
        this.textTransform = getLightTransform(coords, true);
    }

    get canBeNewGotch(): boolean {
        return !this.centerOfGotch && this.adjacentGotches.length > 0;
    }

    public updateFreeFlag() {
        this.free = !this.memberOfGotch.find(gotch => !!gotch.owner);
    }
}