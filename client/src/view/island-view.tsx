import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Vector3} from 'three';
import {Island} from '../island/island';
import {IslandComponent} from './island-component';
import {Spot} from '../island/spot';
import {SpotSelector} from './spot-selector';
import {Orbit} from './orbit';
import {GOTCHI_FACE_MATERIAL} from './materials';
import {Gotchi} from '../gotchi/gotchi';

interface IIslandViewProps {
    width: number;
    height: number;
    island: Island;
}

interface IIslandViewState {
    selectedSpot?: Spot;
}

const SUN_POSITION = new Vector3(0, 300, 200);
const CAMERA_POSITION = new Vector3(0, 500, 0);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);

export class IslandView extends React.Component<IIslandViewProps, IIslandViewState> {
    private selector: SpotSelector;
    private perspectiveCamera: PerspectiveCamera;
    private orbit: Orbit;
    private hoverSpot?: Spot;

    constructor(props: IIslandViewProps) {
        super(props);
        this.state = {};
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, props.width / props.height, 1, 500000);
        const midpoint = props.island.midpoint;
        this.perspectiveCamera.position.add(CAMERA_POSITION.add(midpoint));
        // this.perspectiveCamera.lookAt(midpoint);
        this.orbit = new Orbit(this.perspectiveCamera, midpoint);
        this.selector = new SpotSelector(props.island, this.perspectiveCamera, this.props.width, props.height);
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            console.log(event.code);
            switch (event.code) {
                case 'KeyM':
                    break;
                case 'KeyR':
                    break;
            }
        });
        const step = () => {
            this.orbit.moveTargetTowards(this.props.island.midpoint);
            this.orbit.update();
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
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
            <div id="gotchi-view"
                 onMouseMove={e => this.spotHover(this.selector.getSpot(e))}
                 onMouseDownCapture={e => this.spotClicked(this.selector.getSpot(e))}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent island={this.props.island}/>
                        {
                            this.props.island.gotches
                                .filter(gotch => !!gotch.gotchi)
                                .map(gotch => gotch.gotchi)
                                .map((gotchi: Gotchi, index: number) => {
                                    console.log('gotchi', index);
                                    return <R3.Mesh
                                        ref={(node: any) => gotchi.facesMeshNode = node}
                                        key={`Faces${index}`}
                                        geometry={gotchi.fabric.facesGeometry}
                                        material={GOTCHI_FACE_MATERIAL}
                                    />
                                })
                        }
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================

    private spotClicked(spot?: Spot) {
        if (spot && !spot.centerOfGotch) {
            spot.land = !spot.land;
            const pattern = this.props.island.pattern;
            console.log(`Island(spots-size=${pattern.spots.length}, gotches-size=${pattern.gotches.length})`, pattern);
            this.forceUpdate();
        }
        console.log('clicked', spot);
    }

    private spotHover(spot?: Spot) {
        if (spot !== this.hoverSpot) {
            if (spot) {
                console.log(`hover ${spot.coords.x}, ${spot.coords.y}`);
            }
            this.hoverSpot = spot;
        }
    }
}

