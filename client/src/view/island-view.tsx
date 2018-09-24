import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Vector3} from 'three';
import {Island} from '../island/island';
import {IslandMesh} from './island-mesh';
import {Spot} from '../island/spot';
import {SpotSelector} from './spot-selector';
import {Subscription} from 'rxjs/Subscription';

interface IIslandViewProps {
    width: number;
    height: number;
    island: Island;
}

interface IIslandViewState {
    selectedSpot?: Spot;
}

const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(0, 500, 0);

export class IslandView extends React.Component<IIslandViewProps, IIslandViewState> {
    private selector: SpotSelector;
    private perspectiveCamera: PerspectiveCamera;
    private selectedSubscription: Subscription;

    constructor(props: IIslandViewProps) {
        super(props);
        this.state = {};
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.props.width / this.props.height, 1, 500000);
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
    }

    public componentDidUpdate(prevProps: Readonly<IIslandViewProps>, prevState: Readonly<IIslandViewState>, snapshot: any) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.perspectiveCamera.aspect = this.props.width / this.props.height;
            this.perspectiveCamera.updateProjectionMatrix();
        }
    }

    public componentDidMount() {
        this.selectedSubscription = this.selector.selected.subscribe(spot => {
            if (spot) {
                spot.lit = !spot.lit;
                const pattern = this.props.island.pattern;
                console.log(`Island(spots-size=${pattern.spots.length}, gotches-size=${pattern.gotches.length})`, pattern);
                this.forceUpdate();
            }
        });
    }

    public componentWillUnmount() {
        this.selectedSubscription.unsubscribe();
    }

    public render() {
        return (
            <div id="gotchi-view"
                 onMouseDownCapture={(e) => this.selector.click(e, this.props.width, this.props.height)}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandMesh island={this.props.island}/>
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={new Color(0.8, 0.8, 0.8)}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }
}

