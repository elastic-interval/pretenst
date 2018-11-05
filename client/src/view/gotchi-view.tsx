import * as React from 'react';
import * as R3 from 'react-three';
import {Color, Mesh, PerspectiveCamera, Vector3} from 'three';
import {Evolution} from '../gotchi/evolution';
import {Gotchi} from '../gotchi/gotchi';
import {Island} from '../island/island';
import {EvolutionComponent} from './evolution-component';
import {IslandComponent} from './island-component';
import {Orbit} from './orbit';
import {GotchiComponent} from './gotchi-component';
import {MeshKey, SpotSelector} from './spot-selector';
import {Spot} from '../island/spot';
import {HUNG_ALTITUDE, NORMAL_TICKS} from '../body/fabric';
import {Gotch} from '../island/gotch';

const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(9, HUNG_ALTITUDE / 2, 8);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);
const TARGET_FRAME_RATE = 25;

interface IGotchiViewProps {
    width: number;
    height: number;
    island: Island;
    clickSpot: (spot: Spot) => void;
    gotch?: Gotch;
    gotchi?: Gotchi;
    evolution?: Evolution;
}

interface IGotchiViewState {
    helicopterView: boolean;
}

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private perspectiveCamera: PerspectiveCamera;
    private orbit: Orbit;
    private spotSelector: SpotSelector;
    private frameTime = Date.now();
    private frameCount = 0;
    private frameDelay = 20;
    private animating = true;

    constructor(props: IGotchiViewProps) {
        super(props);
        this.state = {
            helicopterView: false,
        };
        this.perspectiveCamera = new PerspectiveCamera(50, this.props.width / this.props.height, 1, 500000);
        this.perspectiveCamera.position.add(CAMERA_POSITION);
        this.spotSelector = new SpotSelector(
            this.perspectiveCamera,
            this.props.island,
            this.props.width,
            this.props.height
        );
    }

    public componentDidUpdate(prevProps: Readonly<IGotchiViewProps>, prevState: Readonly<IGotchiViewState>, snapshot: any) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.perspectiveCamera.aspect = this.props.width / this.props.height;
            this.perspectiveCamera.updateProjectionMatrix();
        }
    }

    public componentDidMount() {
        this.orbit = new Orbit(document.getElementById('gotchi-view'), this.perspectiveCamera);
        this.animate();
    }

    public componentWillUnmount() {
        this.animating = false;
    }

    public render() {
        this.frameCount++;
        if (this.frameCount === 300) {
            const frameTime = Date.now();
            const framesPerSecond = 1000 / ((frameTime - this.frameTime) / this.frameCount);
            this.frameTime = frameTime;
            this.frameCount = 0;
            if (framesPerSecond > TARGET_FRAME_RATE) {
                this.frameDelay++;
            } else if (framesPerSecond < TARGET_FRAME_RATE) {
                this.frameDelay /= 2;
            }
            // console.log(`FPS: ${Math.floor(framesPerSecond)}: ${this.frameDelay}`);
        }
        return (
            <div id="gotchi-view"
                 onMouseDownCapture={e => {
                     const spot = this.spotSelector.getSpot(e);
                     if (spot) {
                         this.props.clickSpot(spot);
                     }
                 }}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent
                            island={this.props.island}
                            onlyMasterGotch={!this.state.helicopterView}
                            setMesh={(key: MeshKey, node: Mesh) => this.spotSelector.setMesh(key, node)}
                        />
                        {this.gotchiComponent()}
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================

    private gotchiComponent = () => {
        // todo: not for just browsing
        return (
            <R3.Object3D key="EvolutionOrGotchi">
                {!this.props.evolution || this.state.helicopterView ? null : <EvolutionComponent evolution={this.props.evolution}/>}
                {!this.props.gotchi || this.state.helicopterView ? null : <GotchiComponent gotchi={this.props.gotchi}/>}
            </R3.Object3D>
        );
    };

    private animate() {
        const step = () => {
            setTimeout(
                () => {
                    if (this.state.helicopterView) {
                        if (this.props.gotch) {
                            this.orbit.moveTargetTowards(this.props.gotch.center);
                        } else {
                            this.orbit.moveTargetTowards(this.props.island.midpoint);
                        }
                    } else {
                        if (this.props.evolution) {
                            this.props.evolution.iterate();
                            this.orbit.moveTargetTowards(this.props.evolution.midpoint);
                        } else if (this.props.gotchi) {
                            this.props.gotchi.iterate(NORMAL_TICKS);
                            this.orbit.moveTargetTowards(this.props.gotchi.fabric.midpoint);
                        } else if (this.props.gotch) {
                            this.orbit.moveTargetTowards(this.props.gotch.center);
                        }
                    }
                    if (this.animating) {
                        this.forceUpdate();
                        this.orbit.update();
                        if (this.orbit.tooFar !== this.state.helicopterView) {
                            this.setState((state: IGotchiViewState) => {
                                return {helicopterView: this.orbit.tooFar};
                            });
                        }
                        requestAnimationFrame(step);
                    }
                },
                this.frameDelay
            );
        };
        requestAnimationFrame(step);
    }
}

