import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Raycaster, Vector2, Vector3} from 'three';
import {clearFittest, HUNG_ALTITUDE, Population} from '../gotchi/population';
import {Gotchi} from '../gotchi/gotchi';
import {Island} from '../island/island';
import {PopulationMesh} from './population-mesh';
import {PopulationFrontier} from './population-frontier';
import {IslandMesh} from './island-mesh';
import {PopulationOrbit} from './population-orbit';

interface IGotchiViewProps {
    width: number;
    height: number;
    population: Population;
}

interface IGotchiViewState {
    width: number;
    height: number;
    turbo: boolean;
    selectedGotchi?: Gotchi
}

// const SPRING_MATERIAL = new LineBasicMaterial({vertexColors: VertexColors});
const SUN_POSITION = new Vector3(0, 300, 0);
const CAMERA_POSITION = new Vector3(9, HUNG_ALTITUDE / 2, 8);
const TARGET_FRAME_RATE = 25;

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private island = new Island();
    private perspectiveCamera: PerspectiveCamera;
    private rayCaster: Raycaster;
    private mouse = new Vector2();
    private orbit: PopulationOrbit;
    private frameTime = Date.now();
    private frameCount = 0;
    private frameDelay = 20;

    constructor(props: IGotchiViewProps) {
        super(props);
        this.state = {
            width: props.width,
            height: props.height,
            turbo: false,
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000);
        this.perspectiveCamera.position.add(CAMERA_POSITION);
        this.orbit = new PopulationOrbit(this.perspectiveCamera);
        this.rayCaster = new Raycaster();
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
        this.updateDimensions();
    }

    public mouseMove(event: any) {
        this.mouse.x = (event.clientX / this.state.width) * 2 - 1;
        this.mouse.y = -(event.clientY / this.state.height) * 2 + 1;
    }

    public trySelect(event: any): boolean {
        this.mouse.x = (event.clientX / this.state.width) * 2 - 1;
        this.mouse.y = -(event.clientY / this.state.height) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.perspectiveCamera);
        const clickedGotchi = this.props.population.findGotchi(this.rayCaster);
        if (clickedGotchi) {
            clickedGotchi.clicked = true;
            this.setState({selectedGotchi: clickedGotchi});
            console.log('clicked', clickedGotchi);
        }
        return false;
    }

    public componentDidMount() {
        window.addEventListener("resize", this.updateDimensions);
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions);
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
            <div id="gotchi-view" onMouseMove={(e: any) => this.mouseMove(e)} onMouseDownCapture={(e) => this.trySelect(e)}>
                <R3.Renderer width={this.state.width} height={this.state.height}>
                    <R3.Scene width={this.state.width} height={this.state.height} camera={this.perspectiveCamera}>
                        <PopulationMesh population={this.props.population}/>
                        <IslandMesh island={this.island}/>
                        <PopulationFrontier frontier={this.props.population.frontier}/>
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
            this.setState({width: element.clientWidth, height: element.clientHeight});
            console.log(`w=${this.state.width}, h=${this.state.height}`);
            this.perspectiveCamera.aspect = this.state.width / this.state.height;
            this.perspectiveCamera.updateProjectionMatrix();
        }
    };

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

