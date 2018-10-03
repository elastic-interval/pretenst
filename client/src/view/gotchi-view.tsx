import * as React from 'react';
import * as R3 from 'react-three';
import {Color, Mesh, PerspectiveCamera, Vector3} from 'three';
import {Evolution, INITIAL_JOINT_COUNT} from '../gotchi/evolution';
import {Gotchi, IGotchiFactory} from '../gotchi/gotchi';
import {Island} from '../island/island';
import {EvolutionComponent} from './evolution-component';
import {IslandComponent} from './island-component';
import {Orbit} from './orbit';
import {GotchiComponent} from './gotchi-component';
import {SpotSelector} from './spot-selector';
import {Spot, Surface} from '../island/spot';
import {HUNG_ALTITUDE, NORMAL_TICKS} from '../body/fabric';
import {Genome} from '../genetics/genome';
import {Gotch} from '../island/gotch';
import {EvolutionFrontier} from './evolution-frontier';

const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(9, HUNG_ALTITUDE / 2, 8);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);
const TARGET_FRAME_RATE = 25;

interface IGotchiViewProps {
    width: number;
    height: number;
    island: Island;
    master: string;
    factory: IGotchiFactory;
}

interface IGotchiViewState {
    cameraTooFar: boolean;
    masterGotch?: Gotch;
    center: Vector3;
    gotchi?: Gotchi;
    evolution?: Evolution;
}

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private perspectiveCamera: PerspectiveCamera;
    private orbit: Orbit;
    private selector: SpotSelector;
    private frameTime = Date.now();
    private frameCount = 0;
    private frameDelay = 20;
    private animating = true;

    constructor(props: IGotchiViewProps) {
        super(props);
        const masterGotch = props.master ? props.island.findGotch(props.master) : undefined;
        this.state = {
            cameraTooFar: false,
            masterGotch,
            center: masterGotch ? new Vector3(masterGotch.center.scaledCoords.x, 0, masterGotch.center.scaledCoords.y) : new Vector3()
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.props.width / this.props.height, 1, 500000);
        this.perspectiveCamera.position.add(CAMERA_POSITION);
        if (this.state.masterGotch) {
            const coords = this.state.masterGotch.center.scaledCoords;
            const toMasterGotch = new Vector3(coords.x, 0, coords.y);
            this.perspectiveCamera.position.add(toMasterGotch);
            this.perspectiveCamera.lookAt(toMasterGotch);
        }
        this.selector = new SpotSelector(
            this.perspectiveCamera,
            this.props.width,
            this.props.height
        );
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            const evolution = this.state.evolution;
            switch (event.code) {
                case 'KeyS':
                    if (evolution) {
                        if (evolution.fittest && this.state.masterGotch) {
                            console.log('Storing the fittest');
                            localStorage.setItem(this.state.masterGotch.createFingerprint(), JSON.stringify(evolution.fittest.genomeData));
                        }
                    }
                    break;
                case 'KeyG':
                    if (evolution) {
                        evolution.dispose();
                        this.setState((state: IGotchiViewState) => {
                            return {evolution: undefined};
                        });
                        if (evolution.fittest && this.state.masterGotch) {
                            console.log('storing the fittest');
                            // localStorage.setItem(this.homeGotch.createFingerprint(), JSON.stringify(evolution.fittest.genomeData));
                            this.setState((state: IGotchiViewState) => {
                                return {gotchi: evolution.fittest};
                            });
                        }
                    }
                    break;
                case 'KeyE':
                case 'KeyR':
                    if (!evolution) {
                        if (masterGotch) {
                            if (event.code === 'KeyR') {
                                masterGotch.genome = new Genome({
                                    master: props.master,
                                    behaviorSequence: [],
                                    embryoSequence: []
                                });
                            }
                            const genome = masterGotch.genome;
                            if (genome) {
                                this.setState((state: IGotchiViewState) => {
                                    return {evolution: new Evolution(masterGotch, props.factory)};
                                });
                            }
                        }
                    }
                    break;
            }
        });
    }

    public componentDidUpdate(prevProps: Readonly<IGotchiViewProps>, prevState: Readonly<IGotchiViewState>, snapshot: any) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.perspectiveCamera.aspect = this.props.width / this.props.height;
            this.perspectiveCamera.updateProjectionMatrix();
        }
    }

    public componentDidMount() {
        this.orbit = new Orbit(document.getElementById('gotchi-view'), this.perspectiveCamera);
        const masterGotch = this.state.masterGotch;
        if (masterGotch) {
            if (masterGotch.genome) {
                const coords = masterGotch.center.scaledCoords;
                this.props.factory
                    .createGotchiAt(coords.x, coords.y, INITIAL_JOINT_COUNT, masterGotch.genome)
                    .then(gotchi => {
                        this.setState((state: IGotchiViewState) => {
                            return {gotchi};
                        });
                    });
            }
        }
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
            <div id="gotchi-view"
                 onMouseDownCapture={e => this.spotClicked(this.selector.getSpot(e, this.props.island))}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent
                            island={this.props.island}
                            setMesh={(key: string, node: Mesh) => this.selector.setMesh(key, node)}
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
        if (!this.state.cameraTooFar) {
            if (this.state.evolution) {
                return (
                    <R3.Object3D key="EvolutionRendering">
                        <EvolutionComponent evolution={this.state.evolution}/>
                        <EvolutionFrontier frontier={this.state.evolution.frontier}/>
                    </R3.Object3D>
                );
            } else if (this.state.gotchi) {
                return <GotchiComponent key="GotchiRendering" gotchi={this.state.gotchi}/>
            }
        }
        return null;
    };

    private spotClicked = (spot?: Spot) => {
        if (!spot || !this.state.cameraTooFar) {
            return;
        }
        console.log(`Spot ${spot.coords.x} ${spot.coords.y}`);
        const island = this.props.island;
        const centerOfGotch = spot.centerOfGotch;
        if (centerOfGotch) {
            if (centerOfGotch.genome) {
                return;
            }
            if (island.legal && centerOfGotch === island.freeGotch) {
                centerOfGotch.genome = new Genome({
                    master: this.props.master,
                    embryoSequence: [],
                    behaviorSequence: []
                });
                island.refresh();
                island.save();
            }
        } else if (spot.free) {
            switch (spot.surface) {
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
            island.refresh();
        } else if (spot.canBeNewGotch && !this.state.masterGotch) {
            island.removeFreeGotches();
            if (spot.canBeNewGotch) {
                island.createGotch(spot, this.props.master);
            }
            island.refresh();
        }
    };

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
                        } else {
                            this.orbit.moveTargetTowards(this.props.island.midpoint);
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

