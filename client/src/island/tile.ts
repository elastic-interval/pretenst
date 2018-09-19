import {ICoords} from './constants';
import {Gotch} from './gotch';

export class Tile {
    public lit = false;
    public free = false;
    public memberOfGotch: Gotch[] = [];
    public adjacentGotches: Gotch[] = [];
    public centerOfGotch?: Gotch;

    constructor(public coords: ICoords) {
    }

    get canBeNewGotch(): boolean {
        return !this.centerOfGotch && this.adjacentGotches.length > 0;
    }

    public updateFreeFlag() {
        this.free = !this.memberOfGotch.find(gotch => !!gotch.owner);
    }
}