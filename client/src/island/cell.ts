import {getLightTransform, ICoords} from './constants';
import {Token} from './token';

export class Cell {
    public lit = false;
    public free = false;
    public transform: string;
    public textTransform: string;
    public memberOfToken: Token[] = [];
    public adjacentTokens: Token[] = [];
    public centerOfToken?: Token;

    constructor(public coords: ICoords) {
        this.transform = getLightTransform(coords, false);
        this.textTransform = getLightTransform(coords, true);
    }

    get canBeNewToken(): boolean {
        return !this.centerOfToken && this.adjacentTokens.length > 0;
    }

    public updateFreeFlag() {
        this.free = !this.memberOfToken.find(gotch => !!gotch.owner);
    }
}