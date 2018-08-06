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

    public joint(name: string, x: number, y: number, z: number): void {
        this.joints.push(new Joint(name, new Vector3(x, y, z)));
    }

    public interval(a: number, b: number): void {
        this.intervals.push(new Interval(this.joints[a], this.joints[b]));
    }

    public face(j0: number, j1: number, j2: number): void {
        this.faces.push(new Face(this.joints[j0], this.joints[j1], this.joints[j2]))
    }

    public findFace(name: string): Face | null {
        const found = this.faces.find((f: Face): boolean => f.name === name);
        return found ? found : null;
    }

    public tetraFace(face: Face): void {
        this.faces = this.faces.filter((f: Face): boolean => f.name !== face.name);
        const apexJoint = new Joint(face.name, face.apex);
        this.joints.push(apexJoint);
        const diff = new Vector3();
        const l0 = diff.subVectors(face.joints[0].location, face.joints[1].location).length();
        const l1 = diff.subVectors(face.joints[1].location, face.joints[2].location).length();
        const l2 = diff.subVectors(face.joints[2].location, face.joints[0].location).length();
        const idealSpan = (l0 + l1 + l2) / 3;
        face.joints
            .map((j: Joint): Interval => new Interval(j, apexJoint).withIdealSpan(idealSpan))
            .forEach((i: Interval): void => {
                this.intervals.push(i)
            });
        this.faces.push(new Face(face.joints[0], face.joints[1], apexJoint));
        this.faces.push(new Face(face.joints[1], face.joints[2], apexJoint));
        this.faces.push(new Face(face.joints[2], face.joints[0], apexJoint));
    }

    public tetra(): Fabric {
        let name = 0;
        const shake = (): number => (Math.random() - 0.5) * 0.1;
        const joint = (x: number, y: number, z: number): void => this.joint(
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

    public centralize(): void {
        const middle = this.joints.reduce((total: Vector3, joint: Joint): Vector3 => total.add(joint.location), new Vector3()).multiplyScalar(1 / this.joints.length);
        middle.y = 0;
        this.joints.forEach((joint: Joint): void => {
            joint.location.sub(middle);
            joint.velocity.set(0, 0, 0);
        });
    }

    private setAltitude(altitude: number): void {
        // todo: should be in constraints
        const lowest = this.joints.reduce((minAltitude: number, curr: Joint): number => Math.min(minAltitude, curr.location.y), Number.MAX_VALUE);
        this.joints.forEach((joint: Joint): void => {
            joint.location.y = joint.location.y - lowest + altitude
        });
    }

    private calculate(): void {
        this.intervals.forEach((interval: Interval): void => {
            interval.calculate();
            interval.idealSpan = interval.span;
        });
    }

}