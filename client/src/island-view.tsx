import * as React from 'react';
import * as R3 from 'react-three';
import {Color, FaceColors, MeshPhongMaterial, PerspectiveCamera, Vector2, Vector3,} from 'three';
import {Population} from './gotchi/population';
import {Island} from './island/island';

interface IGalapagotchViewProps {
    width: number;
    height: number;
    population: Population;
}

interface IGalapagotchViewState {
    width: number;
    height: number;
}

const FLOOR_MATERIAL = new MeshPhongMaterial({
    vertexColors: FaceColors,
    lights: true,
    visible: true
});
const LIGHT_ABOVE_CAMERA = new Vector3(0, 3, 0);
const CAMERA_POSITION = new Vector3(0, 30, 0);
const CAMERA_TARGET = new Vector3(0, 0, 0);

export class IslandView extends React.Component<IGalapagotchViewProps, IGalapagotchViewState> {
    private THREE = require('three');
    private OrbitControls = require('three-orbit-controls')(this.THREE);
    private galapagotch = new Island();
    private perspectiveCamera: PerspectiveCamera;
    private mouse = new Vector2();
    private orbitControls: any;

    constructor(props: IGalapagotchViewProps) {
        super(props);
        this.state = {
            width: props.width,
            height: props.height,
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000);
        this.perspectiveCamera.position.add(CAMERA_POSITION);
        this.orbitControls = new this.OrbitControls(this.perspectiveCamera);
        this.orbitControls.target.add(CAMERA_TARGET);

        // this.orbitControls.maxPolarAngle = Math.PI / 2 * 0.95;
        // this.rayCaster = new Raycaster();
        this.animate();
        this.keyboardListener();
        this.updateDimensions();
    }

    public mouseMove(event: any) {
        this.mouse.x = (event.clientX / this.state.width) * 2 - 1;
        this.mouse.y = -(event.clientY / this.state.height) * 2 + 1;
    }

    // public trySelect(): boolean {
    //     this.rayCaster.setFromCamera(this.mouse, this.perspectiveCamera);
    //     // const intersect = this.rayCaster.intersectObject(this.facesMeshNode);
    //     // if (intersect.length > 0 && this.state.fabric) {
    //     //     const faceIndex = intersect[0].faceIndex / 3;
    //     //     if (this.state.selectedFaceIndex === undefined || faceIndex !== this.state.selectedFaceIndex) {
    //     //         this.setState({selectedFaceIndex: faceIndex});
    //     //     }
    //     //     return true;
    //     // }
    //     return false;
    // }

    public render() {
        const lightPosition = new Vector3().add(this.perspectiveCamera.position).add(LIGHT_ABOVE_CAMERA);
        return (
            <div id="gotchi-view" onMouseMove={(e: any) => this.mouseMove(e)}>
                <R3.Renderer width={this.state.width} height={this.state.height}>
                    <R3.Scene width={this.state.width} height={this.state.height} camera={this.perspectiveCamera}>
                        <R3.Mesh
                            key="Gotch"
                            geometry={this.galapagotch.geometry}
                            material={FLOOR_MATERIAL}
                        />
                        <R3.PointLight
                            name="Light"
                            key="Light"
                            distance="100"
                            decay="0.01"
                            position={lightPosition}
                        />
                        <R3.HemisphereLight name="Hemi" color={new Color(0.6, 0.6, 0.6)}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    public componentDidMount() {
        window.addEventListener("resize", this.updateDimensions);
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions);
    }

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
                    // this.forceUpdate();
                    this.orbitControls.update();
                    requestAnimationFrame(step);
                },
                100
            );
        };
        requestAnimationFrame(step);
    }

    private keyboardListener() {
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            switch (event.code) {
                case 'KeyM':
                    this.props.population.forDisplay.forEach((gotchi, index) => {
                        console.log(`${index}: ${gotchi.distance}`, gotchi.fabric.midpoint);
                    });
                    break;
            }
        });
    }
}

