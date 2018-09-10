import {IFabricExports} from '../body/fabric-exports';
import {Gotchi} from './gotchi';
import {Fabric} from '../body/fabric';
import {Genome} from '../genetics/genome';

const HANGER_ALTITUDE = 6;

export class Population {
    private gotchiArray: Gotchi[] = [];

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
    }

    public birth() {
        this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, 60);
            fabric.createSeed(5, HANGER_ALTITUDE);
            this.gotchiArray.push(new Gotchi(fabric, new Genome()));
        });
    }

    public get gotchis(): Gotchi[] {
        return this.gotchiArray;
    }
}