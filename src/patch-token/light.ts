import {PatchToken} from './patch-token';
import {getLightTransform, ICoords} from './constants';

export class Light {
    public lit = false;
    public free = false;
    public transform: string;
    public textTransform: string;
    public memberOfToken: PatchToken[] = [];
    public adjacentTokens: PatchToken[] = [];
    public centerOfToken?: PatchToken;

    constructor(public coords: ICoords) {
        this.transform = getLightTransform(coords, false);
        this.textTransform = getLightTransform(coords, true);
    }

    get canBeNewToken(): boolean {
        return !this.centerOfToken && this.adjacentTokens.length > 0;
    }

    public updateFreeFlag() {
        this.free = !this.memberOfToken.find(token => !!token.owner);
    }
}