import * as React from 'react';
import * as R3 from 'react-three';
import {Color, Mesh, PerspectiveCamera, Vector3} from 'three';
import {Island} from '../island/island';
import {IslandComponent} from './island-component';
import {Spot} from '../island/spot';
import {MeshKey, SpotSelector} from './spot-selector';
import {Gotch} from '../island/gotch';

const SUN_POSITION = new Vector3(0, 300, 200);
const CAMERA_POSITION = new Vector3(0, 550, 0);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);

interface IIslandViewProps {
    className: string;
    width: number;
    height: number;
    island: Island;
    onlyMasterGotch: boolean;
    master: string;
}

interface IIslandViewState {
    masterGotch?: Gotch;
    hoverSpot?: Spot;
}

export class IslandView extends React.Component<IIslandViewProps, IIslandViewState> {
    private selector: SpotSelector;
    private perspectiveCamera: PerspectiveCamera;

    constructor(props: IIslandViewProps) {
        super(props);
        const singleGotch = props.island.singleGotch;
        this.state = {
            hoverSpot: singleGotch ? singleGotch.centerSpot : undefined,
            masterGotch: props.master ? props.island.findGotch(props.master) : undefined
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, props.width / props.height, 1, 500000);
        const midpoint = this.props.onlyMasterGotch && this.state.masterGotch ? this.state.masterGotch.center : props.island.midpoint;
        this.perspectiveCamera.position.add(CAMERA_POSITION.add(midpoint));
        this.perspectiveCamera.up.set(0, 0, 1).normalize();
        this.perspectiveCamera.lookAt(midpoint);
        this.selector = new SpotSelector(
            this.perspectiveCamera,
            this.props.island,
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
            <div className={this.props.className}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent
                            setMesh={(key: MeshKey, mesh: Mesh) => this.selector.setMesh(key, mesh)}
                            island={this.props.island}
                            onlyMasterGotch={this.props.onlyMasterGotch}
                        />
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }
}

