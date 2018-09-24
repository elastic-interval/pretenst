import {PerspectiveCamera, Raycaster, Vector2} from 'three';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Spot} from '../island/spot';
import {Island} from '../island/island';

export class SpotSelector {
    public selected = new BehaviorSubject<Spot | undefined>(undefined);
    private rayCaster = new Raycaster();
    private mouse = new Vector2();

    constructor(private island: Island, private camera: PerspectiveCamera) {
    }

    public click(event: any, width: number, height: number) {
        this.mouse.x = (event.clientX / width) * 2 - 1;
        this.mouse.y = -(event.clientY / height) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.camera);
        this.selected.next(this.island.findSpot(this.rayCaster));
    }
}