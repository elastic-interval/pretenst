import {Raycaster, Vector3} from 'three';
import {Gotch, gotchTreeString} from './gotch';
import {ADJACENT, BRANCH_STEP, GOTCH_SHAPE, STOP_STEP} from './shapes';
import {coordSort, equals, ICoords, plus, Spot, spotsToString, zero} from './spot';
import {IFabricExports} from '../body/fabric-exports';
import {HUNG_ALTITUDE} from '../gotchi/population';
import {Fabric} from '../body/fabric';
import {Gotchi} from '../gotchi/gotchi';
import {Genome} from '../genetics/genome';

export interface IslandPattern {
    gotches: string;
    spots: string;
    genomes: Map<string, Genome>;
}

const sortSpotsOnCoord = (a: Spot, b: Spot): number => coordSort(a.coords, b.coords);
const gotchWithMaxNonce = (gotches: Gotch[]) => gotches.reduce((withMax, adjacent) => {
    if (withMax) {
        return adjacent.nonce > withMax.nonce ? adjacent : withMax;
    } else {
        return adjacent;
    }
});

export class Island {
    public spots: Spot[] = [];
    public gotches: Gotch[] = [];
    public freeGotches: Gotch[] = [];
    public facesMeshNode: any;

    constructor(pattern: IslandPattern,
                private createFabricInstance: () => Promise<IFabricExports>) {
        this.apply(pattern);
        this.refresh();
    }

    public apply(pattern: IslandPattern) {
        let gotch: Gotch | undefined = this.getOrCreateGotch(undefined, zero, pattern.genomes);
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
                        gotch = this.gotchAroundSpot(gotch.spots[step], pattern.genomes);
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
                spot.land = land ? land : false;
            });
        } else if (this.singleGotch) {
            this.singleGotch.spots[0].land = true;
        }
        this.refresh();
    }

    public get singleGotch(): Gotch | undefined {
        return this.gotches.length === 1 ? this.gotches[0] : undefined;
    }

    public get midpoint(): Vector3 {
        return this.spots
            .reduce(
                (sum: Vector3, spot: Spot) => {
                    sum.x += spot.scaledCoords.x;
                    sum.z += spot.scaledCoords.y;
                    return sum;
                },
                new Vector3()
            )
            .multiplyScalar(1 / this.spots.length);
    }

    public findSpot(raycaster: Raycaster): Spot | undefined {
        const intersections = raycaster.intersectObject(this.facesMeshNode);
        if (intersections.length && intersections[0].faceIndex) {
            const hit = intersections[0].faceIndex;
            return hit ? this.spots.find(spot => spot.faceIndexes.indexOf(hit) >= 0) : undefined;
        }
        return undefined;
    }

    public get pattern(): IslandPattern | undefined {
        if (this.spots.find(spot => !spot.legal)) {
            return undefined;
        }
        const genomes = new Map<string, Genome>();
        this.gotches.forEach(gotch => {
            if (gotch.gotchi) {
                genomes[gotch.createFingerprint()] = gotch.gotchi.genomeSnapshot;
            }
        });
        return {
            gotches: gotchTreeString(this.gotches),
            spots: spotsToString(this.spots),
            genomes
        };
    }

    public refresh() {
        this.freeGotches = this.gotches.filter(gotch => !gotch.gotchi);
        this.spots.forEach(spot => {
            spot.updateFreeFlag();
            spot.adjacentSpots = this.getAdjacentSpots(spot);
            spot.connected = spot.adjacentSpots.length < 6;
        });
        let flowChanged = true;
        while (flowChanged) {
            flowChanged = false;
            this.spots.forEach(spot => {
                if (!spot.connected) {
                    const connectedByAdjacent = spot.adjacentSpots.find(adj => (adj.land === spot.land) && adj.connected);
                    if (connectedByAdjacent) {
                        spot.connected = true;
                        flowChanged = true;
                    }
                }
            });
        }
    }

    // ================================================================================================

    private gotchAroundSpot(spot: Spot, genomes: Map<string, Genome>): Gotch {
        const adjacentMaxNonce = gotchWithMaxNonce(spot.adjacentGotches);
        return this.getOrCreateGotch(adjacentMaxNonce, spot.coords, genomes);
    }

    private getOrCreateGotch(parent: Gotch | undefined, coords: ICoords, genomes: Map<string, Genome>): Gotch {
        const existing = this.gotches.find(existingGotch => equals(existingGotch.coords, coords));
        if (existing) {
            return existing;
        }
        const spots = GOTCH_SHAPE.map(c => this.getOrCreateSpot(plus(c, coords)));
        const gotch = new Gotch(parent, coords, spots);
        const fingerprint = gotch.createFingerprint();
        const genome = genomes[fingerprint];
        if (genome) {
            this.createBody(gotch.center.scaledCoords).then(fabric => {
                gotch.gotchi = new Gotchi(fabric, genome, 100, 100); // largely fake
            });
        }
        this.gotches.push(gotch);
        return gotch;
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

    private createBody(coords: ICoords): Promise<Fabric> {
        return this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, 15);
            fabric.createSeed(5, HUNG_ALTITUDE, coords.x, coords.y);
            fabric.iterate(1, true);
            return fabric;
        });
    }

}