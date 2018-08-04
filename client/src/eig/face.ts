import {Joint} from './joint';
import {Face3, Geometry, Vector3} from 'three';


export class Face {
    public name: string;
    public selected: boolean;
    public geometry = new Geometry();
    public middle = new Vector3();
    public apex = new Vector3();
    public joints: Joint[];

    constructor(...joints: Joint[]) {
        if (joints.length !== 3) {
            throw new Error('A face has 3 joints');
        }
        this.joints = joints;
        this.name = joints.map(j => j.name).join(':');
        this.geometry = this.createGeometry();
    }

    public update() {
        this.geometry = this.createGeometry();
    }

    private createGeometry() {
        const geometry = new Geometry();
        geometry.vertices = this.joints.map(j => j.location);
        if (this.selected) {
            this.middle.set(0,0,0);
            geometry.vertices.reduce((sum, vector) => sum.add(vector), this.middle).multiplyScalar(1 / 3.0);
            const e1 = new Vector3().subVectors(geometry.vertices[1], this.middle);
            const e2 = new Vector3().subVectors(geometry.vertices[2], this.middle);
            this.apex.crossVectors(e1,e2).setLength(e1.length()).add(this.middle);
            geometry.vertices.push(this.apex);
            geometry.vertices.push(this.middle);
            geometry.faces.push(new Face3(0, 1, 3));
            geometry.faces.push(new Face3(1, 2, 3));
            geometry.faces.push(new Face3(2, 0, 3));
        } else {
            geometry.faces.push(new Face3(0, 1, 2));
        }
        geometry.computeBoundingSphere();
        return geometry;
    }
}
