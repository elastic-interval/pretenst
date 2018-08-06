import {Joint} from './joint';
import {BufferAttribute, BufferGeometry, Face3, Geometry, Vector3} from 'three';

export class Face {
    public name: string;
    public middle = new Vector3();
    public apex = new Vector3();
    public joints: Joint[];

    constructor(...joints: Joint[]) {
        if (joints.length !== 3) {
            throw new Error('A face has 3 joints');
        }
        this.joints = joints;
        this.name = joints.map(j => j.name).join(':');
    }

    public calculate(): void {
        this.middle.set(0, 0, 0);
        const locations = this.joints.map(j => j.location);
        locations.reduce((sum, vector) => sum.add(vector), this.middle).multiplyScalar(1 / 3.0);
        const e1 = new Vector3().subVectors(locations[1], this.middle);
        const e2 = new Vector3().subVectors(locations[2], this.middle);
        this.apex.crossVectors(e1, e2).setLength(e1.length()).add(this.middle);
    }

    public get triangleGeometry(): Geometry {
        const geometry = new Geometry();
        geometry.vertices = this.joints.map(j => j.location);
        geometry.faces.push(new Face3(0, 1, 2));
        geometry.computeBoundingSphere();
        return geometry;
    }

    public get tripodGeometry(): BufferGeometry {
        this.calculate();
        const g = new BufferGeometry();
        const positions = new Float32Array(this.joints.length * 6);
        g.addAttribute('position', new BufferAttribute(positions, 3));
        let index = 0;
        this.joints.forEach((joint: Joint) => {
            positions[index++] = joint.location.x;
            positions[index++] = joint.location.y;
            positions[index++] = joint.location.z;
            positions[index++] = this.apex.x;
            positions[index++] = this.apex.y;
            positions[index++] = this.apex.z;
        });
        return g;
    }
}
