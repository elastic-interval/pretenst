import {Vector3} from 'three';
import {Hexalot, hexalotTreeString} from './hexalot';
import {ADJACENT, BRANCH_STEP, GOTCH_SHAPE, STOP_STEP} from './shapes';
import {coordSort, equals, ICoords, plus, Spot, spotsToString, Surface, zero} from './spot';
import {Genome} from '../genetics/genome';
import {IGotchiFactory} from '../gotchi/gotchi';
import {BehaviorSubject} from 'rxjs/index';

export interface IslandPattern {
    hexalots: string;
    spots: string;
}

export interface IslandChange {
    hexalotCount: number;
    spotCount: number;
    masterHexalot?: Hexalot;
}

const sortSpotsOnCoord = (a: Spot, b: Spot): number => coordSort(a.coords, b.coords);
const hexalotWithMaxNonce = (hexalots: Hexalot[]) => hexalots.reduce((withMax, adjacent) => {
    if (withMax) {
        return adjacent.nonce > withMax.nonce ? adjacent : withMax;
    } else {
        return adjacent;
    }
});

export class Island {
    public master?: string;
    public islandChange = new BehaviorSubject<IslandChange>({hexalotCount: 0, spotCount: 0});
    public spots: Spot[] = [];
    public hexalots: Hexalot[] = [];

    constructor(public islandName: string, private gotchiFactory: IGotchiFactory) {
        const patternString = localStorage.getItem(this.islandName);
        const pattern: IslandPattern = patternString ? JSON.parse(patternString) : {hexalots: '', spots: ''};
        this.spots = [];
        this.hexalots = [];
        this.apply(pattern);
        // console.log('island', this.spots.map(spot => spot.coords));
    }

    public get freeHexalot(): Hexalot | undefined {
        return this.hexalots.find(hexalot => !hexalot.genome);
    }

    public get masterHexalot(): Hexalot | undefined {
        return this.hexalots.find(hexalot => hexalot.master === this.master);
    }

    public get legal(): boolean {
        return !this.spots.find(spot => !spot.legal);
    }

    public refresh() {
        this.spots.forEach(spot => {
            spot.adjacentSpots = this.getAdjacentSpots(spot);
            spot.connected = spot.adjacentSpots.length < 6;
        });
        let flowChanged = true;
        while (flowChanged) {
            flowChanged = false;
            this.spots.forEach(spot => {
                if (!spot.connected) {
                    const connectedByAdjacent = spot.adjacentSpots.find(adj => (adj.surface === spot.surface) && adj.connected);
                    if (connectedByAdjacent) {
                        spot.connected = true;
                        flowChanged = true;
                    }
                }
            });
        }
        this.spots.forEach(spot => spot.refresh());
        this.islandChange.next({
            hexalotCount: this.hexalots.length,
            spotCount: this.spots.length,
            masterHexalot: this.master ? this.findHexalot(this.master) : undefined
        });
    }

    public save() {
        if (this.legal) {
            localStorage.setItem(this.islandName, JSON.stringify(this.pattern));
            this.hexalots.forEach(hexalot => {
                if (hexalot.genome) {
                    localStorage.setItem(hexalot.createFingerprint(), hexalot.genome.toJSON());
                }
            });
            console.log(`Saved ${this.islandName}`);
        } else {
            console.log(`Not legal yet: ${this.islandName}`);
        }
    }

    public findHexalot(master: string): Hexalot | undefined {
        return this.hexalots.find(hexalot => !!hexalot.genome && hexalot.genome.master === master)
    }

    public removeFreeHexalots(): void {
        const deadHexalots = this.hexalots.filter(hexalot => !hexalot.genome);
        deadHexalots.forEach(deadHexalot => {
            this.hexalots = this.hexalots.filter(hexalot => !equals(hexalot.coords, deadHexalot.coords));
            deadHexalot.destroy().forEach(deadSpot => {
                this.spots = this.spots.filter(spot => !equals(spot.coords, deadSpot.coords));
            });
        });
    }

    public createHexalot(spot: Spot, master: string): Hexalot | undefined {
        if (this.hexalots.find(hexalot => hexalot.master === master)) {
            console.error(`${master} already has a hexalot!`);
            return undefined;
        }
        if (!spot.canBeNewHexalot) {
            console.error(`${JSON.stringify(spot.coords)} cannot be a hexalot!`);
            return undefined;
        }
        return this.hexalotAroundSpot(spot);
    }

    public get singleHexalot(): Hexalot | undefined {
        return this.hexalots.length === 1 ? this.hexalots[0] : undefined;
    }

    public get midpoint(): Vector3 {
        return this.spots
            .reduce((sum: Vector3, spot: Spot) => sum.add(spot.center), new Vector3())
            .multiplyScalar(1 / this.spots.length);
    }

    public get pattern(): IslandPattern | undefined {
        if (this.spots.find(spot => !spot.legal)) {
            return undefined;
        }
        this.spots.sort(sortSpotsOnCoord);
        return {
            hexalots: hexalotTreeString(this.hexalots),
            spots: spotsToString(this.spots)
        } as IslandPattern;
    }

    // ================================================================================================

    private apply(pattern: IslandPattern) {
        let hexalot: Hexalot | undefined = this.getOrCreateHexalot(undefined, zero);
        const stepStack = pattern.hexalots.split('').reverse().map(stepChar => Number(stepChar));
        const hexalotStack: Hexalot[] = [];
        while (stepStack.length > 0) {
            const step = stepStack.pop();
            switch (step) {
                case STOP_STEP:
                    hexalot = hexalotStack.pop();
                    break;
                case BRANCH_STEP:
                    if (hexalot) {
                        hexalotStack.push(hexalot);
                    }
                    break;
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    if (hexalot) {
                        hexalot = this.hexalotAroundSpot(hexalot.spots[step]);
                    }
                    break;
                default:
                    console.error('Error step');
            }
        }
        const hexChars = pattern.spots ? pattern.spots.split('') : [];
        const numbers = hexChars.map(hexChar => parseInt(hexChar, 16));
        const booleanArrays = numbers.map(nyb => {
            const b0 = (nyb & 8) !== 0;
            const b1 = (nyb & 4) !== 0;
            const b2 = (nyb & 2) !== 0;
            const b3 = (nyb & 1) !== 0;
            return [b0, b1, b2, b3];
        });
        const landStack = [].concat.apply([], booleanArrays).reverse();
        this.spots.sort(sortSpotsOnCoord);
        if (landStack.length) {
            this.spots.forEach(spot => {
                const land = landStack.pop();
                spot.surface = land ? Surface.Land : Surface.Water;
            });
        } else if (this.singleHexalot) {
            this.singleHexalot.spots[0].surface = Surface.Land;
        }
        this.hexalots.forEach(g => {
            const fingerprint = g.createFingerprint();
            const storedGenome = localStorage.getItem(fingerprint);
            if (storedGenome) {
                g.genome = new Genome(JSON.parse(storedGenome));
            }
        });
        this.refresh();
    }

    private hexalotAroundSpot(spot: Spot): Hexalot {
        const adjacentMaxNonce = hexalotWithMaxNonce(spot.adjacentHexalots);
        return this.getOrCreateHexalot(adjacentMaxNonce, spot.coords);
    }

    private getOrCreateHexalot(parent: Hexalot | undefined, coords: ICoords): Hexalot {
        const existing = this.hexalots.find(existingHexalot => equals(existingHexalot.coords, coords));
        if (existing) {
            return existing;
        }
        const spots = GOTCH_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)));
        const hexalot = new Hexalot(parent, coords, spots, this.gotchiFactory);
        this.hexalots.push(hexalot);
        return hexalot;
    }

    private getOrCreateSpot(coords: ICoords): Spot {
        const existing = this.getSpot(coords);
        if (existing) {
            return existing;
        }
        const spot = new Spot(coords);
        this.spots.push(spot);
        return spot;
    }

    private getAdjacentSpots(spot: Spot): Spot[] {
        const adjacentSpots: Spot[] = [];
        const coords = spot.coords;
        ADJACENT.forEach(a => {
            const adjacentSpot = this.getSpot(plus(a, coords));
            if (adjacentSpot) {
                adjacentSpots.push(adjacentSpot);
            }
        });
        return adjacentSpots;
    }

    private getSpot(coords: ICoords): Spot | undefined {
        return this.spots.find(p => equals(p.coords, coords));
    }
}
