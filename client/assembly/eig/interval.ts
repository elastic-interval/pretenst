import {Vector3} from 'three';
import {Joint} from './joint';

export class Interval {
    public span: number = 1;
    public idealSpan: number = 1.4;
    public stress: number = 0;
    public location: Vector3 = new Vector3();
    public unit: Vector3 = new Vector3();

    constructor(
        public alpha: Joint,
        public omega: Joint
    ) {
        this.idealSpan = this.unit.subVectors(this.omega.location, this.alpha.location).length();
    }

    public withIdealSpan(idealSpan: number): Interval {
        this.idealSpan = idealSpan;
        return this;
    }

    public calculate(): void {
        this.span = this.unit.subVectors(this.omega.location, this.alpha.location).length();
        this.unit.multiplyScalar(1.0/this.span);
        this.location.addVectors(this.omega.location, this.alpha.location).multiplyScalar(0.5);
    }
}
