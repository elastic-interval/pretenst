import {Fabric} from './fabric';
import {IGenomeReader} from './genome';

export class GenomeInterpreter {

    constructor(private fabric: Fabric, private reader: IGenomeReader) {
    }

    public step() {
        this.reader.nextChoice(6); // fake
        const faceIndex = this.fabric.faceCount - 1;
        console.log(`face ${faceIndex} of ${this.fabric.faceCount}`);
        this.fabric.createTetra(faceIndex);
    }
}