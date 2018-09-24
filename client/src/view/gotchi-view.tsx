import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Vector3} from 'three';
import {clearFittest, HUNG_ALTITUDE, Population} from '../gotchi/population';
import {Gotchi} from '../gotchi/gotchi';
import {Island} from '../island/island';
import {PopulationMesh} from './population-mesh';
import {PopulationFrontier} from './population-frontier';
import {IslandMesh} from './island-mesh';
import {PopulationOrbit} from './population-orbit';
import {PopulationSelector} from './population-selector';
import {Subscription} from 'rxjs/Subscription';

interface IGotchiViewProps {
    width: number;
    height: number;
    population: Population;
    island: Island;
}

interface IGotchiViewState {
    turbo: boolean;
    selectedGotchi?: Gotchi
}

// const SPRING_MATERIAL = new LineBasicMaterial({vertexColors: VertexColors}); // todo: if this doesn't get used, remove it from WA
const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(9, HUNG_ALTITUDE / 2, 8);
const TARGET_FRAME_RATE = 25;

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private perspectiveCamera: PerspectiveCamera;
    private orbit: PopulationOrbit;
    private selector: PopulationSelector;
    private selectedSubscription: Subscription;
    private frameTime = Date.now();
    private frameCount = 0;
    private frameDelay = 20;

    constructor(props: IGotchiViewProps) {
        super(props);
        this.state = {
            turbo: false,
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.props.width / this.props.height, 1, 500000);
        this.perspectiveCamera.position.add(CAMERA_POSITION);
        this.orbit = new PopulationOrbit(this.perspectiveCamera);
        this.selector = new PopulationSelector(this.props.population, this.perspectiveCamera);
        this.animate();
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            switch (event.code) {
                case 'Space':
                    this.setState({turbo: !this.state.turbo});
                    break;
                case 'KeyM':
                    this.props.population.forDisplay.forEach((gotchi, index) => {
                        console.log(`${index}: ${gotchi.distance}`, gotchi.fabric.midpoint);
                    });
                    break;
                case 'KeyR':
                    clearFittest();
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
        this.selectedSubscription= this.selector.selected.subscribe(selectedGotchi => {
            if (selectedGotchi) {
                selectedGotchi.clicked = true;
                // setFittest(selectedGotchi);
            }
            this.setState({selectedGotchi});
        });
    }

    public componentWillUnmount() {
        this.selectedSubscription.unsubscribe();
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
                 onMouseDownCapture={(e) => this.selector.click(e, this.props.width, this.props.height)}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <PopulationMesh population={this.props.population}/>
                        <IslandMesh island={this.props.island}/>
                        <PopulationFrontier frontier={this.props.population.frontier}/>
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={new Color(0.8, 0.8, 0.8)}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================

    private animate() {
        const step = () => {
            setTimeout(
                () => {
                    if (this.state.turbo) {
                        for (let walk = 0; walk < 29; walk++) {
                            this.props.population.iterate();
                        }
                    }
                    this.props.population.iterate();
                    this.forceUpdate();
                    this.orbit.moveTargetTowards(this.props.population.midpoint);
                    this.orbit.update();
                    requestAnimationFrame(step);
                },
                this.frameDelay
            );
        };
        requestAnimationFrame(step);
    }


}

