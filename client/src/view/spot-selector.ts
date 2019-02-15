import {Mesh, PerspectiveCamera, Raycaster, Vector2} from 'three';
import {Island} from '../island/island';
import {Spot} from '../island/spot';

export enum MeshKey {
    SPOTS_KEY = 'Spots',
    SEEDS_KEY = 'Seeds',
}

export class SpotSelector {
    private meshes = new Map<MeshKey, Mesh>();
    private rayCaster = new Raycaster();
    private mouse = new Vector2();
    private size = new Vector2();

    constructor(private camera: PerspectiveCamera, private island: Island, width: number, height: number) {
        this.setSize(width, height);
    }

    public setMesh(key: MeshKey, mesh: Mesh) {
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

    public getSpot(meshKey: MeshKey, event: any): Spot | undefined {
        this.adjustRaycaster(event);
        return this.findSpot(meshKey);
    }

    // ==================

    private adjustRaycaster(event: any) {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.size.x) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.size.y) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.camera);
    }

    private findSpot(meshKey: MeshKey): Spot | undefined {
        const mesh = this.meshes[meshKey];
        const intersections = this.rayCaster.intersectObjects([mesh], true)
            .filter(i => i.faceIndex !== undefined);
        const spots = intersections.map(intersection => {
            const faceName = `${meshKey}:${intersection.faceIndex}`;
            return this.island.spots.find(spot => spot.faceNames.indexOf(faceName) >= 0);
        });
        return spots.pop();
    }
}