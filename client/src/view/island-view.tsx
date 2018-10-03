import * as React from 'react';
import * as R3 from 'react-three';
import {Color, Mesh, PerspectiveCamera, Vector3} from 'three';
import {Island} from '../island/island';
import {IslandComponent} from './island-component';
import {Spot, Surface} from '../island/spot';
import {SpotSelector} from './spot-selector';
import {Genome} from '../genetics/genome';
import {Gotch} from '../island/gotch';

interface IIslandViewProps {
    width: number;
    height: number;
    island: Island;
    master: string;
}

interface IIslandViewState {
    masterGotch?: Gotch;
    hoverSpot?: Spot;
}

const SUN_POSITION = new Vector3(0, 300, 200);
const CAMERA_POSITION = new Vector3(0, 260, 0);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);

export class IslandView extends React.Component<IIslandViewProps, IIslandViewState> {
    private selector: SpotSelector;
    private perspectiveCamera: PerspectiveCamera;

    constructor(props: IIslandViewProps) {
        super(props);
        const singleGotch = props.island.singleGotch;
        this.state = {
            hoverSpot: singleGotch ? singleGotch.center : undefined,
            masterGotch: props.master ? props.island.findGotch(props.master) : undefined
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, props.width / props.height, 1, 500000);
        const midpoint = props.island.midpoint;
        this.perspectiveCamera.position.add(CAMERA_POSITION.add(midpoint));
        this.perspectiveCamera.up.set(0, 0, 1).normalize();
        this.perspectiveCamera.lookAt(midpoint);
        this.selector = new SpotSelector(
            this.perspectiveCamera,
            this.props.width,
            this.props.height
        );
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            console.log(event.code);
            switch (event.code) {
                case 'KeyM':
                    break;
                case 'KeyR':
                    break;
            }
        });
    }

    public componentDidUpdate(prevProps: Readonly<IIslandViewProps>, prevState: Readonly<IIslandViewState>, snapshot: any) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.perspectiveCamera.aspect = this.props.width / this.props.height;
            this.perspectiveCamera.updateProjectionMatrix();
            this.selector.setSize(this.props.width, this.props.height);
        }
    }

    public render() {
        return (
            <div id="island-view"
                 onMouseDownCapture={e => this.spotClicked(this.selector.getSpot(e, this.props.island))}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent
                            setMesh={(key: string, mesh: Mesh) => this.selector.setMesh(key, mesh)}
                            island={this.props.island}
                        />
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================

    private spotClicked(spot?: Spot) {
        if (!spot) {
            return;
        }
        const island = this.props.island;
        const centerOfGotch = spot.centerOfGotch;
        if (centerOfGotch) {
            if (centerOfGotch.genome) {
                return;
            }
            // todo: review this below
            if (island.legal) {
                centerOfGotch.genome = new Genome({
                    master: this.props.master,
                    embryoSequence: [],
                    behaviorSequence: []
                });
                island.save();
            }
        } else if (spot.free) {
            switch(spot.surface) {
                case Surface.Unknown:
                    spot.surface = Surface.Water;
                    break;
                case Surface.Land:
                    spot.surface = Surface.Water;
                    break;
                case Surface.Water:
                    spot.surface = Surface.Land;
                    break;
            }
            const freeGotch = island.freeGotch;
            island.refresh();
            if (island.legal && freeGotch) {
                freeGotch.genome = new Genome({
                    master: this.props.master,
                    embryoSequence: [],
                    behaviorSequence: []
                });
                island.refresh();
            }
        } else if (spot.canBeNewGotch && !this.state.masterGotch) {
            island.removeFreeGotches();
            if (spot.canBeNewGotch) {
                island.createGotch(spot, this.props.master);
            }
            island.refresh();
        } else {
            console.log(`refresh ${spot.coords.x} ${spot.coords.y}`);
            island.refresh();
        }
    }
}

