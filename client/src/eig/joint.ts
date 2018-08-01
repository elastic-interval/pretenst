import {Vector3} from 'three';

export class Joint {
    constructor(
        public name: string,
        public location: Vector3,
        public velocity = new Vector3(),
        public absorbVelocity = new Vector3(),
        public force = new Vector3(),
        public gravity = new Vector3(),
        public intervalMass = 1,
        public altitude = 1
    ) {
    }
}