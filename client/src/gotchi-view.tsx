import * as React from 'react';
import * as R3 from 'react-three';
import {
    Color,
    LineBasicMaterial,
    Material,
    MeshPhongMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Quaternion,
    Vector2,
    Vector3,
    VertexColors
} from 'three';
import {IFabricExports} from './body/fabric-exports';
import {Population} from './gotchi/population';
import {Gotchi} from './gotchi/gotchi';

interface IGotchiViewProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IGotchiViewState {
    width: number;
    height: number;
    xray: boolean;
    paused: boolean;
    population: Population;
}

const FACE_MATERIAL = new MeshPhongMaterial({
    lights: true,
    color: new Color(0.9, 0.9, 0.9),
    transparent: true,
    opacity: 0.6,
    visible: true
});
const SPRING_MATERIAL = new LineBasicMaterial({vertexColors: VertexColors});
const LIGHT_ABOVE_CAMERA = new Vector3(0, 3, 0);
const CAMERA_ALTITUDE = 4.5;
const TARGET_FRAME_RATE = 20;
const FLOOR_QUATERNION = new Quaternion().setFromAxisAngle(new Vector3(-1, 0, 0), Math.PI / 2);

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private THREE = require('three');
    private OrbitControls = require('three-orbit-controls')(this.THREE);
    private floorMaterial: Material;
    private perspectiveCamera: PerspectiveCamera;
    private mouse = new Vector2();
    private orbitControls: any;
    private facesMeshNode: any;
    private timeSweepCount = 0;
    private frameTime = Date.now();
    private frameCount = 0;
    private frameDelay = 20;

    constructor(props: IGotchiViewProps) {
        super(props);
        this.state = {
            width: window.innerWidth,
            height: window.innerHeight - 30,
            xray: false,
            paused: false,
            population: new Population(props.createFabricInstance)
        };
        this.floorMaterial = FACE_MATERIAL;
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 5000);
        this.perspectiveCamera.position.set(12, CAMERA_ALTITUDE, 8);
        this.orbitControls = new this.OrbitControls(this.perspectiveCamera);
        this.orbitControls.target = new Vector3(0, CAMERA_ALTITUDE, 0);
        // this.orbitControls.maxPolarAngle = Math.PI / 2 * 0.95;
        // this.rayCaster = new Raycaster();
        this.animate();
        this.keyboardListener();
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
        this.frameCount++;
        if (this.frameCount === 30) {
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
        const lightPosition = new Vector3().add(this.perspectiveCamera.position).add(LIGHT_ABOVE_CAMERA);
        return (
            <div onMouseMove={(e: any) => this.mouseMove(e)}>
                <R3.Renderer width={this.state.width} height={this.state.height}>
                    <R3.Scene width={this.state.width} height={this.state.height} camera={this.perspectiveCamera}>
                        {
                            this.state.xray ?
                                this.state.population.gotchis.map((gotchi: Gotchi, index: number) => {
                                    return <R3.LineSegments
                                        key={`Lines${index}`}
                                        geometry={gotchi.lineSegmentsGeometry}
                                        material={SPRING_MATERIAL}
                                    />
                                })
                                :
                                this.state.population.gotchis.map((gotchi: Gotchi, index: number) => {
                                    return <R3.Mesh
                                        ref={(node: any) => this.facesMeshNode = node}
                                        key={`Faces${index}`} name="Fabric"
                                        geometry={gotchi.facesGeometry}
                                        material={FACE_MATERIAL}
                                    />
                                })
                        }
                        {this.state.xray ? null :
                            <R3.Mesh
                                key="Floor"
                                geometry={new PlaneGeometry(1, 1)}
                                scale={new Vector3(1000, 1000, 1000)}
                                material={this.floorMaterial}
                                quaternion={FLOOR_QUATERNION}
                            />
                        }
                        {this.state.xray ? null :
                            <R3.PointLight
                                name="Light"
                                key="Light"
                                distance="60"
                                decay="2"
                                position={lightPosition}
                            />
                        }
                        <R3.HemisphereLight name="Hemi" color={new Color(0.4, 0.4, 0.4)}/>
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
        this.setState({width: window.innerWidth, height: window.innerHeight});
        this.perspectiveCamera.aspect = this.state.width / this.state.height;
        this.perspectiveCamera.updateProjectionMatrix();
    };

    private animate() {
        const step = () => {
            setTimeout(
                () => {
                    if (!this.state.paused) {
                        const timeSweeps = this.state.population.gotchis.map(gotchi => gotchi.iterate(60));
                        if (this.timeSweepCount > 0 && Math.max(...timeSweeps) === 0) {
                            console.log(`trigger sweep ${this.timeSweepCount}`);
                            this.state.population.gotchis.forEach(gotchi => gotchi.triggerAllRoles());
                            this.timeSweepCount--;
                        }
                        this.forceUpdate();
                    }
                    this.orbitControls.update();
                    requestAnimationFrame(step);
                },
                this.frameDelay
            );
        };
        requestAnimationFrame(step);
    }

    private keyboardListener() {
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            switch (event.code) {
                case 'KeyG':
                    this.state.population.birth();
                    break;
                // case 'KeyR':
                //     this.createFabricInstance(true);
                //     break;
                case 'KeyM':
                    this.state.population.gotchis.forEach(gotchi => gotchi.attachRoleToIntervalPair());
                    break;
                case 'KeyX':
                    this.setState({xray: !this.state.xray});
                    break;
                case 'Space':
                    this.timeSweepCount++;
                    console.log(`add sweep ${this.timeSweepCount}`);
                    break;
            }
        })
    }
}

