import {Vector3} from 'three';

export class Joint {
    constructor(
        public name: string,
        public location: Vector3
    ) {
    }

    // force?: Vector3;
    // velocity?: Vector3;
    // absorbVelocity?: Vector3;
    // gravity?: Vector3;
    // intervalMass?: number;
    // altitude?: number;
}