import {Joint} from './joint';
import {Interval} from './interval';
import {Vector3} from 'three';

export class Fabric {

    constructor(
        public joints: Joint[] = [],
        public intervals: Interval[] = []
    ) {
    }

    public joint(name: string, x: number, y: number, z: number) {
        this.joints.push(new Joint(name, new Vector3(x, y, z)));
    }

    public interval(a: number, b: number) {
        this.intervals.push(new Interval(this.joints[a], this.joints[b]));
    }

    public tetra(): Fabric {
        let name = 0;
        const joint = (x: number, y: number, z: number) => this.joint((name++).toString(), x, y, z);
        joint(1, -1, 1);
        joint(-1, 1, 1);
        joint(-1, -1, -1);
        joint(1, 1, -1);
        this.interval(0, 1);
        this.interval(1, 2);
        this.interval(2, 3);
        this.interval(0, 2);
        this.interval(0, 3);
        this.interval(1, 3);
        return this;
    }
}