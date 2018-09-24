import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Vector3} from 'three';
import {Island} from '../island/island';
import {IslandMesh} from './island-mesh';
import {Spot} from '../island/spot';
import {SpotSelector} from './spot-selector';

interface IIslandViewProps {
    width: number;
    height: number;
    island: Island;
}

interface IIslandViewState {
    width: number;
    height: number;
    selectedSpot?: Spot;
}

const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(0, 500, 0);

export class IslandView extends React.Component<IIslandViewProps, IIslandViewState> {
    private selector: SpotSelector;
    private perspectiveCamera: PerspectiveCamera;

    constructor(props: IIslandViewProps) {
        super(props);
        this.state = {
            width: props.width,
            height: props.height,
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000);
        const midpoint = props.island.midpoint;
        this.perspectiveCamera.position.add(CAMERA_POSITION.add(midpoint));
        this.perspectiveCamera.lookAt(midpoint);
        this.selector = new SpotSelector(this.props.island, this.perspectiveCamera);
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            console.log(event.code);
            switch (event.code) {
                case 'KeyM':
                    break;
                case 'KeyR':
                    break;
            }
        });
        this.updateDimensions();
    }

    public componentDidMount() {
        this.selector.selected.subscribe(spot => {
            if (spot) {
                spot.lit = !spot.lit;
                const pattern = this.props.island.pattern;
                console.log(`Island(spots-size=${pattern.spots.length}, gotches-size=${pattern.gotches.length})`, pattern);
                this.forceUpdate();
            }
        });
        window.addEventListener("resize", this.updateDimensions);
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions);
    }

    public render() {
        return (
            <div id="gotchi-view"
                 onMouseDownCapture={(e) => this.selector.click(e, this.state.width, this.state.height)}>
                <R3.Renderer width={this.state.width} height={this.state.height}>
                    <R3.Scene width={this.state.width} height={this.state.height} camera={this.perspectiveCamera}>
                        <IslandMesh island={this.props.island}/>
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={new Color(0.8, 0.8, 0.8)}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================
    private updateDimensions = () => {
        const element = document.getElementById('gotchi-view');
        if (element) {
            // todo: watch this: it wil adjust size
            this.setState({width: element.clientWidth, height: element.clientHeight});
            console.log(`w=${this.state.width}, h=${this.state.height}`);
            this.perspectiveCamera.aspect = this.state.width / this.state.height;
            this.perspectiveCamera.updateProjectionMatrix();
        }
    };
}

