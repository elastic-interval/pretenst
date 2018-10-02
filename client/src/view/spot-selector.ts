import {Mesh, PerspectiveCamera, Raycaster, Vector2} from 'three';
import {Spot} from '../island/spot';
import {Island} from '../island/island';

export class SpotSelector {
    private meshes = new Map<string, Mesh>();
    private rayCaster = new Raycaster();
    private mouse = new Vector2();
    private size = new Vector2();

    constructor(private camera: PerspectiveCamera, width: number, height: number) {
        this.setSize(width, height);
    }

    public setMesh(key: string, mesh: Mesh) {
        if (mesh) {
            this.meshes[key] = mesh;
        } else {
            delete this.meshes[key];
        }
    }

    public setSize(width: number, height: number) {
        this.size.x = width;
        this.size.y = height;
    }

    public getSpot(event: any, island: Island): Spot | undefined {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.size.x) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.size.y) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.camera);
        return this.findSpot(island);
    }

    public findSpot(island: Island): Spot | undefined {
        const uuidToKey = new Map<string, string>();
        const meshes: Mesh[] = [];
        Object.keys(this.meshes).forEach(key => {
            const mesh = this.meshes[key];
            meshes.push(mesh);
            uuidToKey[mesh.uuid] = key;
        });
        const intersections = this.rayCaster.intersectObjects(meshes, true);
        if (intersections.length && intersections[0].faceIndex) {
            const intersection = intersections[0];
            const key = uuidToKey[intersection.object.uuid];
            const faceName = `${key}:${intersection.faceIndex}`;
            return island.spots.find(spot => spot.faceNames.indexOf(faceName) >= 0);
        }
        return undefined;
    }
}