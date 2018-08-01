import {Vector3} from 'three';
import {Joint} from './joint';

export class Interval {
    public span = 1;
    public idealSpan = 1;
    public stress = 0;
    public location = new Vector3();
    public unit = new Vector3();

    constructor(
        public alpha: Joint,
        public omega: Joint
    ) {
    }

    public calculate() {
        this.unit.subVectors(this.omega.location, this.alpha.location).normalize();
        this.location.addVectors(this.omega.location, this.alpha.location).multiplyScalar(0.5);
    }
}
