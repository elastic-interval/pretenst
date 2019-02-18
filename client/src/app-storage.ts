import {PhysicsFeature} from './body/physics'
import {IGenomeData} from './genetics/genome'
import {Hexalot} from './island/hexalot'
import {IslandPattern} from './island/island'

const MASTER_KEY = 'master'

export class AppStorage {

    constructor(private storage: Storage) {
    }

    public getMaster(): string | undefined {
        const value = this.storage.getItem(MASTER_KEY)
        return value ? value : undefined
    }

    public setMaster(master: string) {
        this.storage.setItem(MASTER_KEY, master)
    }

    public getPhysicsFeature(feature: PhysicsFeature): number {
        const value = this.storage.getItem(feature)
        return value ? parseFloat(value) : 1.0
    }

    public setPhysicsFeature(feature: PhysicsFeature, factor: number) {
        this.storage.setItem(feature, factor.toFixed(3))
    }

    public getIsland(islandName: string): IslandPattern {
        const patternString = this.storage.getItem(islandName)
        return patternString ? JSON.parse(patternString) : {hexalots: '', spots: ''}
    }

    public setIsland(islandName: string, islandPattern: IslandPattern) {
        this.storage.setItem(islandName, JSON.stringify(islandPattern))
    }

    public getGenome(hexalot: Hexalot): IGenomeData | undefined {
        const genomeString = this.storage.getItem(hexalot.createFingerprint())
        return genomeString ? JSON.parse(genomeString) : undefined
    }

    public setGenome(hexalot: Hexalot, genomeData: IGenomeData) {
        this.storage.setItem(hexalot.createFingerprint(), JSON.stringify(genomeData))
    }
}
