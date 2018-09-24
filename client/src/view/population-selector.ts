import {PerspectiveCamera, Raycaster, Vector2} from 'three';
import {Population} from '../gotchi/population';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Gotchi} from '../gotchi/gotchi';

export class PopulationSelector {
    public selected = new BehaviorSubject<Gotchi | undefined>(undefined);
    private rayCaster = new Raycaster();
    private mouse = new Vector2();

    constructor(private population: Population, private camera: PerspectiveCamera) {
    }

    public click(event: any, width: number, height: number) {
        this.mouse.x = (event.clientX / width) * 2 - 1;
        this.mouse.y = -(event.clientY / height) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.camera);
        const clickedGotchi = this.population.findGotchi(this.rayCaster);
        console.log('clicked', clickedGotchi);
        this.selected.next(clickedGotchi);
    }
}