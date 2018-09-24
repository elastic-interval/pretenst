import {PerspectiveCamera, Raycaster, Vector2} from 'three';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Tile} from '../island/tile';
import {Island} from '../island/island';

export class TileSelector {
    public selected = new BehaviorSubject<Tile | undefined>(undefined);
    private rayCaster = new Raycaster();
    private mouse = new Vector2();

    constructor(private island: Island, private camera: PerspectiveCamera) {
    }

    public click(event: any, width: number, height: number) {
        this.mouse.x = (event.clientX / width) * 2 - 1;
        this.mouse.y = -(event.clientY / height) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.camera);
        const clickedTile = this.island.findTile(this.rayCaster);
        console.log('clicked', clickedTile);
        this.selected.next(clickedTile);
    }
}