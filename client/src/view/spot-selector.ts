import {PerspectiveCamera, Raycaster, Vector2} from 'three';
import {Spot} from '../island/spot';
import {Island} from '../island/island';

export class SpotSelector {
    private rayCaster = new Raycaster();
    private mouse = new Vector2();
    private size = new Vector2();

    constructor(private island: Island, private camera: PerspectiveCamera, width: number, height: number) {
        this.setSize(width, height);
    }

    public setSize(width: number, height: number) {
        this.size.x = width;
        this.size.y = height;
    }

    public getSpot(event: any): Spot | undefined {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.size.x) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.size.y) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.camera);
        return this.island.findSpot(this.rayCaster);
    }
}