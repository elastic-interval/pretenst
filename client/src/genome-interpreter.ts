import {Fabric} from './fabric';
import {IGenomeReader} from './genome';

export class GenomeInterpreter {

    constructor(private fabric: Fabric, private reader: IGenomeReader) {
    }

    public step() {
        const faceIndex = this.fabric.faceCount - this.reader.nextChoice(10) - 1;
        console.log(`face ${faceIndex} of ${this.fabric.faceCount}`);
        this.fabric.createTetra(faceIndex);
    }
}