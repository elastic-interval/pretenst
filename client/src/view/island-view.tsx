import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Vector3} from 'three';
import {Island} from '../island/island';
import {IslandComponent} from './island-component';
import {Spot} from '../island/spot';
import {SpotSelector} from './spot-selector';
import {Gotch} from '../island/gotch';
import {Genome} from '../genetics/genome';

interface IIslandViewProps {
    width: number;
    height: number;
    island: Island;
    master: string;
}

interface IIslandViewState {
    selectedGotch?: Gotch;
    selectedSpot?: Spot;
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
        console.log('master', props.master);
        const singleGotch = props.island.singleGotch;
        this.state = {
            selectedGotch: props.island.findGotch(props.master),
            hoverSpot: singleGotch ? singleGotch.center : undefined
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, props.width / props.height, 1, 500000);
        const midpoint = props.island.midpoint;
        this.perspectiveCamera.position.add(CAMERA_POSITION.add(midpoint));
        this.perspectiveCamera.up.set(0, 0, 1).normalize();
        this.perspectiveCamera.lookAt(midpoint);
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

    public componentDidMount() {
        this.selector = new SpotSelector(
            this.props.island,
            this.perspectiveCamera,
            this.props.width,
            this.props.height
        );
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
                 onMouseMove={e => this.spotHover(this.selector.getSpot(e))}
                 onMouseDownCapture={e => this.spotClicked(this.selector.getSpot(e))}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent island={this.props.island}
                                         selectedGotch={this.state.selectedGotch}
                                         master={this.props.master}
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
        if (spot) {
            const island = this.props.island;
            const masterGotch = island.findGotch(this.props.master);
            const gotch = masterGotch ? masterGotch : island.singleGotch;
            if (gotch) {
                if (gotch.center === spot) {
                    if (island.legal) {
                        if (!gotch.gotchi) {
                            gotch.genome = new Genome({
                                master: this.props.master,
                                embryoSequence: [],
                                behaviorSequence: []
                            });
                            gotch.triggerBirth();
                        }
                        island.save();
                    }
                } else {
                    spot.land = !spot.land;
                    island.refresh();
                }
            }
            this.forceUpdate();
        }
    }

    private spotHover(spot?: Spot) {
        const singleGotch = this.props.island.singleGotch;
        if (!singleGotch) {
            if (spot !== this.state.hoverSpot) {
                // this.setState({hoverSpot: spot});
            }
        }
    }
}

