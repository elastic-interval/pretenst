import * as React from 'react';
import * as R3 from 'react-three';
import {Color, Face3, FaceColors, Geometry, MeshPhongMaterial, Vector3} from 'three';
import {Island} from '../island/island';

export interface ISurfaceMeshProps {
    island: Island;
}

export interface ISurfaceMeshState {
    editMode: boolean;
}

const LIT_COLOR = new Color(1, 1, 0.6);
const UNLIT_COLOR = new Color(0.5, 0.5, 0.5);
const SIX = 6;
const NORMAL_SPREAD = 0.02;
const UP = new Vector3(0, 1, 0);
const HEXAGON_POINTS = [
    new Vector3(0, 0, -10),
    new Vector3(-8.66, 0, -5),
    new Vector3(-8.66, 0, 5),
    new Vector3(0, 0, 10),
    new Vector3(8.66, 0, 5),
    new Vector3(8.66, 0, -5),
    new Vector3()
];
const FLOOR_MATERIAL = new MeshPhongMaterial({
    vertexColors: FaceColors,
    lights: true,
    visible: true
});

const islandGeometry = (island: Island): Geometry => {
    const faces: Face3[] = [];
    const vertices: Vector3[] = [];
    const transform = new Vector3();
    island.tiles.forEach((tile, tileIndex) => {
        const color = tile.lit ? LIT_COLOR : UNLIT_COLOR;
        transform.x = tile.scaledCoords.x;
        // transform.y = tile.centerOfGotch ? 0.1 : 0;
        transform.z = tile.scaledCoords.y;
        vertices.push(...HEXAGON_POINTS.map(vertex => new Vector3().addVectors(vertex, transform)));
        for (let a = 0; a < SIX; a++) {
            const offset = tileIndex * HEXAGON_POINTS.length;
            const b = (a + 1) % SIX;
            tile.faceIndexes.push(faces.length);
            faces.push(new Face3(
                offset + SIX, offset + a, offset + b,
                [
                    UP,
                    new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], NORMAL_SPREAD).normalize(),
                    new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], NORMAL_SPREAD).normalize()
                ],
                color
            ));
        }
    });
    const geometry = new Geometry();
    geometry.vertices = vertices;
    geometry.faces = faces;
    geometry.computeBoundingSphere();
    return geometry;
};

export class IslandMesh extends React.Component<ISurfaceMeshProps, ISurfaceMeshState> {

    private geometry: Geometry;

    constructor(props: ISurfaceMeshProps) {
        super(props);
        this.state = {
            editMode: false
        };
    }

    public render() {
        if (this.geometry) {
            this.geometry.dispose();
        }
        this.geometry = islandGeometry(this.props.island);
        return <R3.Mesh
            key="Floor"
            geometry={this.geometry}
            ref={(node: any) => this.props.island.facesMeshNode = node}
            material={FLOOR_MATERIAL}
        />
    }

}