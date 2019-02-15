import * as React from 'react';
import * as R3 from 'react-three';
import {Color, Geometry, Mesh, PerspectiveCamera, Vector3} from 'three';
import {Evolution} from '../gotchi/evolution';
import {Gotchi} from '../gotchi/gotchi';
import {Island} from '../island/island';
import {EvolutionComponent} from './evolution-component';
import {IslandComponent} from './island-component';
import {Orbit, OrbitDistance} from './orbit';
import {GotchiComponent} from './gotchi-component';
import {MeshKey, SpotSelector} from './spot-selector';
import {Spot} from '../island/spot';
import {HUNG_ALTITUDE, NORMAL_TICKS} from '../body/fabric';
import {Gotch} from '../island/gotch';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {USER_POINTER_MATERIAL} from './materials';
import {Subscription} from 'rxjs/Subscription';
import {TripComponent} from './trip-component';
import {Trip} from '../island/trip';

export const HIGH_ALTITUDE = 1000;

const SUN_POSITION = new Vector3(0, 400, 0);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);
const TARGET_FRAME_RATE = 25;

interface IGotchiViewProps {
    perspectiveCamera: PerspectiveCamera;
    width: number;
    height: number;
    island: Island;
    selectedSpot: BehaviorSubject<Spot | undefined>;
    orbitDistance: BehaviorSubject<OrbitDistance>;
    gotch?: Gotch;
    gotchi?: Gotchi;
    evolution?: Evolution;
    trip?: Trip;
}

interface IGotchiViewState {
    orbitDistance: OrbitDistance;
}

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private subs: Subscription[] = [];
    private orbit: Orbit;
    private spotSelector: SpotSelector;
    private frameTime = Date.now();
    private frameCount = 0;
    private frameDelay = 20;
    private animating = true;
    private target?: Vector3;

    constructor(props: IGotchiViewProps) {
        super(props);
        this.props.perspectiveCamera.position.addVectors(props.island.midpoint, new Vector3(0, HIGH_ALTITUDE / 2, 0));
        this.state = {
            orbitDistance: this.props.orbitDistance.getValue()
        };
        this.spotSelector = new SpotSelector(
            this.props.perspectiveCamera,
            this.props.island,
            this.props.width,
            this.props.height
        );
    }

    public componentDidUpdate(prevProps: Readonly<IGotchiViewProps>, prevState: Readonly<IGotchiViewState>, snapshot: any) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.props.perspectiveCamera.aspect = this.props.width / this.props.height;
            this.props.perspectiveCamera.updateProjectionMatrix();
        }
    }

    public componentDidMount() {
        const element = document.getElementById('gotchi-view');
        this.target = this.props.island.midpoint;
        this.orbit = new Orbit(element, this.props.perspectiveCamera, this.props.orbitDistance, this.target);
        this.animate();
        this.subs.push(this.props.orbitDistance.subscribe(orbitDistance => this.setState({orbitDistance})));
        this.subs.push(this.props.selectedSpot.subscribe(spot => {
            if (spot) {
                if (spot.centerOfGotch) {
                    this.target = new Vector3(0, HUNG_ALTITUDE, 0).add(spot.center);
                } else if (spot.canBeNewGotch || spot.free) {
                    this.target = spot.center;
                }
            }
        }));
    }

    public componentWillUnmount() {
        this.animating = false;
        this.subs.forEach(s => s.unsubscribe());
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
            <div id="gotchi-view" onMouseDownCapture={this.onMouseDownCapture}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.props.perspectiveCamera}>
                        <IslandComponent
                            island={this.props.island}
                            setMesh={(key: MeshKey, node: Mesh) => this.spotSelector.setMesh(key, node)}
                        />
                        {!this.props.evolution ? null : (
                            <EvolutionComponent evolution={this.props.evolution}/>)
                        }
                        {!this.props.gotchi ? null : (
                            <GotchiComponent gotchi={this.props.gotchi}/>
                        )}
                        <R3.LineSegments
                            key="Pointer"
                            geometry={this.pointerGeometry}
                            material={USER_POINTER_MATERIAL}
                        />
                        {!this.props.trip ? null : (
                            <TripComponent trip={this.props.trip}/>
                        )}
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================

    private get onMouseDownCapture() {
        return (event: any) => {
            if (this.props.evolution || this.props.gotchi) {
                return;
            }
            const spot = this.spotSelector.getSpot(MeshKey.SPOTS_KEY, event);
            if (spot && (spot.centerOfGotch || spot.canBeNewGotch || spot.free)) {
                this.props.selectedSpot.next(spot);
            }
        }
    }

    // private get pointerGeometry(): Geometry | null {
    //     this.perspectiveCamera.updateProjectionMatrix();
    //     const upDown = this.state.orbitState === OrbitState.CRUISE ? -1 : 1;
    //     const userCoords = (x: number): Vector3 => {
    //         return new Vector3(x * 0.4 * upDown, -0.7 * upDown, -0.1 * upDown)
    //             .unproject(this.perspectiveCamera);
    //     };
    //     const geometry = new Geometry();
    //     const spot = this.props.selectedSpot.getValue();
    //     const action = this.props.evolution || this.props.gotchi;
    //     if (spot && this.orbit && !this.orbit.changing && !action) {
    //         const target = spot.centerOfGotch ? new Vector3(0, HUNG_ALTITUDE, 0).add(spot.center) : spot.center;
    //         geometry.vertices = [userCoords(0), target, userCoords(-1), target, userCoords(1), target];
    //     }
    //     return geometry;
    // }

    private get pointerGeometry(): Geometry | null {
        const geometry = new Geometry();
        const spot = this.props.selectedSpot.getValue();
        const action = this.props.evolution || this.props.gotchi;
        if (spot && this.orbit && !action) {
            const target = spot.centerOfGotch ? new Vector3(0, HUNG_ALTITUDE, 0).add(spot.center) : spot.center;
            geometry.vertices = [target, new Vector3().addVectors(target, SUN_POSITION)];
        }
        return geometry;
    }

    private animate() {
        const step = () => {
            setTimeout(
                () => {
                    if (this.props.evolution) {
                        this.props.evolution.iterate();
                        this.target = this.props.evolution.midpoint;
                    }
                    if (this.props.gotchi) {
                        this.props.gotchi.iterate(NORMAL_TICKS);
                        this.target = this.props.gotchi.midpoint;
                    }
                    if (this.target) {
                        this.orbit.moveTargetTowards(this.target);
                    }
                    if (this.animating) {
                        this.orbit.update();
                        this.forceUpdate();
                        requestAnimationFrame(step);
                    }
                },
                this.frameDelay
            );
        };
        requestAnimationFrame(step);
    }
}

