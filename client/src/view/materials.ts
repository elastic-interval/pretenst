import {Color, FaceColors, LineBasicMaterial, MeshPhongMaterial} from 'three';

export const GOTCHI_FACE_MATERIAL = new MeshPhongMaterial({
    lights: true,
    color: new Color('silver'),
    transparent: true,
    opacity: 0.6
});

export const ISLAND_MATERIAL = new MeshPhongMaterial({
    vertexColors: FaceColors,
    lights: true
});

export const HANGER_MATERIAL = new LineBasicMaterial({
    color: new Color('crimson')
});
