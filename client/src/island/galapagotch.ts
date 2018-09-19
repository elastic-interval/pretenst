import {Face3, Geometry, Vector3} from 'three';

const NORMAL_SPREAD = 2;
const CENTER = new Vector3();
const UP = new Vector3(0,1,0);
export const HEXAGON_POINTS = [
    new Vector3(0, 0, -1),
    new Vector3(-0.866, 0, -0.5),
    new Vector3(-0.866, 0, 0.5),
    new Vector3(0, 0, 1),
    new Vector3(0.866, 0, 0.5),
    new Vector3(0.866, 0, -0.5)
];

export class Galapagotch {

    public get geometry(): Geometry {
        const faces: Face3[] = [];
        for (let a = 0; a < HEXAGON_POINTS.length; a++) {
            const b = (a + 1) % HEXAGON_POINTS.length;
            faces.push(new Face3(HEXAGON_POINTS.length, a, b, [
                UP,
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], NORMAL_SPREAD).normalize(),
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], NORMAL_SPREAD).normalize()
            ]));
        }
        const geometry = new Geometry();
        geometry.vertices = HEXAGON_POINTS.concat(CENTER);
        geometry.faces = faces;
        geometry.computeBoundingSphere();
        return geometry;
    }
}