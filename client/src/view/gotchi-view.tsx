import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Vector3} from 'three';
import {Evolution, INITIAL_JOINT_COUNT} from '../gotchi/evolution';
import {Gotchi, IGotchiFactory} from '../gotchi/gotchi';
import {Island} from '../island/island';
import {EvolutionComponent} from './evolution-component';
import {IslandComponent} from './island-component';
import {Orbit} from './orbit';
import {GotchiComponent} from './gotchi-component';
import {SpotSelector} from './spot-selector';
import {Spot} from '../island/spot';
import {HUNG_ALTITUDE, NORMAL_TICKS} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Gotch} from '../island/gotch';
import {EvolutionFrontier} from './evolution-frontier';

interface IGotchiViewProps {
    width: number;
    height: number;
    island: Island;
    master: string;
    factory: IGotchiFactory;
}

interface IGotchiViewState {
    cameraTooFar: boolean;
    gotchi?: Gotchi;
    evolution?: Evolution;
}

// const SPRING_MATERIAL = new LineBasicMaterial({vertexColors: VertexColors}); // todo: if this doesn't get used, remove it from WA
const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(9, HUNG_ALTITUDE / 2, 8);
const TARGET_FRAME_RATE = 25;

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private perspectiveCamera: PerspectiveCamera;
    private homeGotch?: Gotch;
    private orbit: Orbit;
    private selector: SpotSelector;
    private frameTime = Date.now();
    private frameCount = 0;
    private frameDelay = 20;
    private animating = true;

    constructor(props: IGotchiViewProps) {
        super(props);
        this.homeGotch = props.island.findGotch(props.master);
        this.state = {
            cameraTooFar: false
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.props.width / this.props.height, 1, 500000);
        this.perspectiveCamera.position.add(CAMERA_POSITION);
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            const evolution = this.state.evolution;
            const gotchi = this.state.gotchi;
            switch (event.code) {
                case 'KeyG':
                    if (evolution) {
                        evolution.dispose();
                        this.setState((state: IGotchiViewState) => {
                            return {evolution: undefined};
                        });
                        if (evolution.fittest && this.homeGotch) {
                            console.log('storing the fittest');
                            localStorage.setItem(this.homeGotch.createFingerprint(), JSON.stringify(evolution.fittest.genomeData));
                            this.setState((state: IGotchiViewState) => {
                                return {gotchi: evolution.fittest};
                            });
                        }
                    }
                    break;
                case 'KeyE':
                    if (!evolution) {
                        if (gotchi) {
                            this.setState((state: IGotchiViewState) => {
                                return {evolution: new Evolution(new Genome(gotchi.genomeData), props.factory)};
                            });
                        }
                    }
                    break;
                case 'KeyR':
                    if (!evolution) {
                        const emptyGenome = new Genome({
                            master: props.master,
                            behaviorSequence: [],
                            embryoSequence: []
                        });
                        this.setState((state: IGotchiViewState) => {
                            return {evolution: new Evolution(emptyGenome, props.factory)};
                        });
                    }
                    break;
            }
        });
        const genome = this.homeGotch ? this.homeGotch.genome : undefined;
        if (this.homeGotch && genome) {
            props.factory.createGotchiAt(this.homeGotch.coords.x, this.homeGotch.coords.y, INITIAL_JOINT_COUNT, genome).then(gotchi => {
                this.setState((state: IGotchiViewState) => {
                    return {gotchi};
                });
            });
        }
    }

    public componentDidUpdate(prevProps: Readonly<IGotchiViewProps>, prevState: Readonly<IGotchiViewState>, snapshot: any) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.perspectiveCamera.aspect = this.props.width / this.props.height;
            this.perspectiveCamera.updateProjectionMatrix();
        }
    }

    public componentDidMount() {
        this.orbit = new Orbit(document.getElementById('gotchi-view'), this.perspectiveCamera);
        this.selector = new SpotSelector(
            this.props.island,
            this.perspectiveCamera,
            this.props.width,
            this.props.height
        );
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
            console.log(`FPS: ${Math.floor(framesPerSecond)}: ${this.frameDelay}`);
        }
        return (
            <div id="gotchi-view" onMouseDownCapture={e => this.spotClicked(this.selector.getSpot(e))}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent island={this.props.island} master={this.props.master}/>
                        {this.liveComponent()}
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={new Color(0.8, 0.8, 0.8)}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================

    private liveComponent = () => {
        if (this.state.evolution) {
            return (
                <R3.Object3D key="EvolutionRendering">
                    <EvolutionComponent evolution={this.state.evolution}/>
                    <EvolutionFrontier frontier={this.state.evolution.frontier}/>
                </R3.Object3D>
            );
        } else if (this.state.gotchi) {
            return <GotchiComponent key="GotchiRendering" gotchi={this.state.gotchi}/>
        } else {
            return null;
        }
    };

    private spotClicked(spot?: Spot) {
        if (this.state.cameraTooFar && spot && spot.centerOfGotch) {
            const gotch = spot.centerOfGotch;
            console.log('clicked gotch', gotch.coords);
        }
    }

    private animate() {
        const step = () => {
            setTimeout(
                () => {
                    if (this.state.cameraTooFar) {
                        this.orbit.moveTargetTowards(this.props.island.midpoint);
                    } else {
                        const evolution = this.state.evolution;
                        const gotchi = this.state.gotchi;
                        if (evolution) {
                            evolution.iterate();
                            this.orbit.moveTargetTowards(evolution.midpoint);
                            // todo: this is escape-of-the-fittest, remove it
                            // if (this.props.evolution.fittest) {
                            //     this.setState({selectedGotchi: this.props.evolution.fittest});
                            //     this.props.evolution.fittest = undefined;
                            // }
                        } else if (gotchi) {
                            gotchi.iterate(NORMAL_TICKS);
                            this.orbit.moveTargetTowards(gotchi.fabric.midpoint);
                        }
                    }
                    if (this.animating) {
                        this.forceUpdate();
                        this.orbit.update();
                        if (this.orbit.tooFar !== this.state.cameraTooFar) {
                            this.setState((state: IGotchiViewState) => {
                                return {cameraTooFar: this.orbit.tooFar};
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

