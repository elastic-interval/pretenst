import {Joint} from './joint';
import {Interval} from './interval';
import {Vector3} from 'three';
import {Face} from './face';

export class Fabric {

    constructor(
        public joints: Joint[] = [],
        public intervals: Interval[] = [],
        public faces: Face[] = []
    ) {
    }

    public joint(name: string, x: number, y: number, z: number) {
        this.joints.push(new Joint(name, new Vector3(x, y, z)));
    }

    public interval(a: number, b: number) {
        this.intervals.push(new Interval(this.joints[a], this.joints[b]));
    }

    public face(j0: number, j1: number, j2: number) {
        this.faces.push(new Face(this.joints[j0], this.joints[j1], this.joints[j2]))
    }

    public findFace(name: string) {
        return this.faces.find(f => f.name === name);
    }

    public tetraFace(face: Face) {
        this.faces = this.faces.filter(f => f.name !== face.name);
        const apexJoint = new Joint(face.name, face.apex);
        this.joints.push(apexJoint);
        const diff = new Vector3();
        const l0 = diff.subVectors(face.joints[0].location, face.joints[1].location).length();
        const l1 = diff.subVectors(face.joints[1].location, face.joints[2].location).length();
        const l2 = diff.subVectors(face.joints[2].location, face.joints[0].location).length();
        const idealSpan = (l0 + l1 + l2) / 3;
        face.joints.map(j => new Interval(j, apexJoint).withIdealSpan(idealSpan)).forEach(i => this.intervals.push(i));
        this.faces.push(new Face(face.joints[0], face.joints[1], apexJoint));
        this.faces.push(new Face(face.joints[1], face.joints[2], apexJoint));
        this.faces.push(new Face(face.joints[2], face.joints[0], apexJoint));
    }

    public tetra(): Fabric {
        let name = 0;
        const shake = () => (Math.random() - 0.5) * 0.1;
        const joint = (x: number, y: number, z: number) => this.joint(
            (name++).toString(),
            x + shake(),
            y + shake(),
            z + shake()
        );
        joint(1, -1, 1);
        joint(-1, 1, 1);
        joint(-1, -1, -1);
        joint(1, 1, -1);
        this.interval(0, 1);
        this.interval(1, 2);
        this.interval(2, 3);
        this.interval(2, 0);
        this.interval(0, 3);
        this.interval(3, 1);
        this.face(0, 1, 2);
        this.face(1, 3, 2);
        this.face(1, 0, 3);
        this.face(2, 3, 0);
        this.calculate();
        this.setAltitude(2);
        return this;
    }

    public centralize() {
        const middle = this.joints.reduce((total, joint) => total.add(joint.location), new Vector3()).multiplyScalar(1 / this.joints.length);
        middle.y = 0;
        this.joints.forEach(joint => {
            joint.location.sub(middle);
            joint.velocity.set(0, 0, 0);
        });
    }

    private setAltitude(altitude: number) {
        // todo: should be in constraints
        const lowest = this.joints.reduce((minAltitude: number, curr: Joint) => Math.min(minAltitude, curr.location.y), Number.MAX_VALUE);
        this.joints.forEach(joint => joint.location.y = joint.location.y - lowest + altitude);
    }

    private calculate() {
        this.intervals.forEach(interval => {
            interval.calculate();
            interval.idealSpan = interval.span;
        });
    }

}