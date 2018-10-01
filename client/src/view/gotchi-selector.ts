import {PerspectiveCamera, Raycaster, Vector2} from 'three';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Gotchi} from '../gotchi/gotchi';

export class GotchiSelector {
    public selected = new BehaviorSubject<Gotchi | undefined>(undefined);
    private rayCaster = new Raycaster();
    private mouse = new Vector2();

    constructor(private gotchiArray: Gotchi[], private camera: PerspectiveCamera) {
    }

    public click(event: any, width: number, height: number) {
        this.mouse.x = (event.clientX / width) * 2 - 1;
        this.mouse.y = -(event.clientY / height) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.camera);
        const clickedGotchi = this.findGotchi();
        console.log('clicked', clickedGotchi);
        this.selected.next(clickedGotchi);
    }

    public findGotchi(): Gotchi | undefined {
        return this.gotchiArray
            .filter(gotchi => gotchi.facesMeshNode)
            .find(gotchi => this.rayCaster.intersectObject(gotchi.facesMeshNode).length > 0);
    }

}