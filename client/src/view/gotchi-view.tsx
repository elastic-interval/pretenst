import * as React from 'react';
import * as R3 from 'react-three';
import {Color, Mesh, PerspectiveCamera, Vector3} from 'three';
import {Evolution, INITIAL_JOINT_COUNT} from '../gotchi/evolution';
import {Gotchi} from '../gotchi/gotchi';
import {Island} from '../island/island';
import {EvolutionComponent} from './evolution-component';
import {IslandComponent} from './island-component';
import {Orbit} from './orbit';
import {GotchiComponent} from './gotchi-component';
import {SpotSelector} from './spot-selector';
import {Spot, Surface} from '../island/spot';
import {HUNG_ALTITUDE, NORMAL_TICKS} from '../body/fabric';
import {freshGenomeFor} from '../genetics/genome';
import {Gotch} from '../island/gotch';
import {TripComponent} from './trip-component';
import {Direction} from '../body/fabric-exports';
import {Trip} from '../island/trip';

const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(9, HUNG_ALTITUDE / 2, 8);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);
const TARGET_FRAME_RATE = 25;

interface IGotchiViewProps {
    width: number;
    height: number;
    island: Island;
    master: string;
}

interface IGotchiViewState {
    cameraTooFar: boolean;
    trip: Trip;
    masterGotch?: Gotch;
    center: Vector3;
    gotchi?: Gotchi;
    evolution?: Evolution;
}

function dispose(state: IGotchiViewState) {
    if (state.gotchi) {
        state.gotchi.dispose();
    }
    if (state.evolution) {
        state.evolution.dispose();
    }
}

function startEvolution(gotch: Gotch, trip: Trip) {
    return (state: IGotchiViewState) => {
        dispose(state);
        return {
            gotchi: undefined,
            evolution: new Evolution(gotch, trip)
        };
    };
}

function startGotchi(gotchi: Gotchi) {
    return (state: IGotchiViewState) => {
        dispose(state);
        gotchi.travel = state.trip.createTravel(0);
        return {
            gotchi,
            evolution: undefined,
        };
    };
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
        const tripSpots = masterGotch ? [masterGotch.centerSpot, masterGotch.centerSpot.adjacentSpots[0]] : [];
        this.state = {
            masterGotch,
            trip: new Trip(tripSpots),
            cameraTooFar: false,
            center: masterGotch ? masterGotch.center : new Vector3()
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.props.width / this.props.height, 1, 500000);
        this.perspectiveCamera.position.add(CAMERA_POSITION);
        if (this.state.masterGotch) {
            this.perspectiveCamera.position.add(this.state.masterGotch.center);
        }
        this.selector = new SpotSelector(
            this.perspectiveCamera,
            this.props.width,
            this.props.height
        );
        window.addEventListener("keydown", (event: KeyboardEvent) => {
            const setDirection = (direction: Direction) => {
                const gotchi = this.state.gotchi;
                if (gotchi) {
                    gotchi.direction = direction;
                }
            };
            switch (event.code) {
                case 'ArrowUp':
                    setDirection(Direction.FORWARD);
                    break;
                case 'ArrowRight':
                    setDirection(Direction.RIGHT);
                    break;
                case 'ArrowLeft':
                    setDirection(Direction.LEFT);
                    break;
                case 'ArrowDown':
                    setDirection(Direction.REVERSE);
                    break;
            }
        });
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            switch (event.code) {
                case 'KeyG':
                    this.birthFromGotch(this.state.masterGotch);
                    break;
                case 'KeyE':
                case 'KeyY':
                    if (masterGotch && tripSpots.length > 0) {
                        const randomize = event.code === 'KeyY';
                        if (randomize) {
                            masterGotch.genome = freshGenomeFor(props.master);
                        }
                        this.setState(startEvolution(masterGotch, this.state.trip))
                    }
                    break;
                case 'KeyL':
                    if (this.state.gotchi) {
                        console.log('genome', this.state.gotchi.genomeData);
                    }
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
        const masterGotch = this.state.masterGotch;
        const target = masterGotch ? masterGotch.center : undefined;
        this.orbit = new Orbit(document.getElementById('gotchi-view'), this.perspectiveCamera, target);
        this.birthFromGotch(masterGotch);
        // if (masterGotch) {
        //     this.setState(startEvolution(masterGotch, this.state.tripSpots[1]))
        // }
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
                 onMouseDownCapture={e => this.spotClicked(this.selector.getSpot(e, this.props.island))}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent
                            island={this.props.island}
                            onlyMasterGotch={!this.state.cameraTooFar}
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

    private birthFromGotch(gotch?: Gotch) {
        if (gotch) {
            const promisedGotchi = gotch.createGotchi(INITIAL_JOINT_COUNT);
            if (promisedGotchi) {
                promisedGotchi.then(gotchi => this.setState(startGotchi(gotchi)));
            }
        }
    }

    private gotchiComponent = () => {
        return (
            <R3.Object3D key="EvolutionOrGotchi">
                {!this.state.evolution || this.state.cameraTooFar ? null : <EvolutionComponent evolution={this.state.evolution}/>}
                {!this.state.gotchi || this.state.cameraTooFar  ? null : <GotchiComponent gotchi={this.state.gotchi}/>}
                <TripComponent trip={this.state.trip}/>
            </R3.Object3D>
        );
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
                centerOfGotch.genome = freshGenomeFor(this.props.master);
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

