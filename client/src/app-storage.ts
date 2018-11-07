import {PhysicsFeature} from './body/physics';
import {Gotch} from './island/gotch';
import {IslandPattern} from './island/island';
import {IGenomeData} from './genetics/genome';

const MASTER_KEY = 'master';

export class AppStorage {

    constructor(private storage: Storage) {
    }

    public getMaster(): string | undefined {
        const value = this.storage.getItem(MASTER_KEY);
        return value ? value : undefined;
    }

    public setMaster(master: string) {
        this.storage.setItem(MASTER_KEY, master);
    }

    public getPhysicsFeature(feature: PhysicsFeature): number {
        const value = this.storage.getItem(feature);
        return value ? parseFloat(value) : 1.0;
    }

    public setPhysicsFeature(feature: PhysicsFeature, factor: number) {
        this.storage.setItem(feature, factor.toFixed(3))
    }

    public getIsland(islandName: string): IslandPattern {
        const patternString = this.storage.getItem(islandName);
        return patternString ? JSON.parse(patternString) : {gotches: '', spots: ''};
    }

    public setIsland(islandName: string, islandPattern: IslandPattern) {
        this.storage.setItem(islandName, JSON.stringify(islandPattern));
    }

    public getGenome(gotch: Gotch): IGenomeData | undefined {
        const genomeString = this.storage.getItem(gotch.createFingerprint());
        return genomeString ? JSON.parse(genomeString) : undefined;
    }

    public setGenome(gotch: Gotch, genomeData: IGenomeData) {
        this.storage.setItem(gotch.createFingerprint(), JSON.stringify(genomeData));
    }
}