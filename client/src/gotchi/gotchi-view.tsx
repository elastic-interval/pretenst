import * as React from 'react';
import * as R3 from 'react-three';
import {
    BufferGeometry,
    Color,
    LineBasicMaterial,
    Material,
    MeshPhongMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Quaternion,
    Raycaster,
    Vector2,
    Vector3,
    VertexColors
} from 'three';
import {Fabric} from './fabric';
import {IFabricExports} from './fabric-exports';
import {Genome, IGeneExecution} from './genome';

interface IGotchiViewProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IGotchiViewState {
    width: number;
    height: number;
    paused: boolean;
    fabric?: Fabric;
    genome?: Genome;
    growthExecution?: IGeneExecution;
    behaviorExecution?: IGeneExecution;
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
const HANGER_ALTITUDE = 6;
const CAMERA_ALTITUDE = 4.5;
const HANG_DELAY = 70;
const REBIRTH_DELAY = 100;

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private THREE = require('three');
    private OrbitControls = require('three-orbit-controls')(this.THREE);
    private floorMaterial: Material;
    private perspectiveCamera: PerspectiveCamera;
    private mouse = new Vector2();
    private orbitControls: any;
    private rayCaster: any;
    private facesMeshNode: any;
    private stayHanging = HANG_DELAY;
    private stayAlive = REBIRTH_DELAY;

    constructor(props: IGotchiViewProps) {
        super(props);
        this.state = {
            width: window.innerWidth,
            height: window.innerHeight,
            paused: false
        };
        this.createFabricInstance(false);
        this.floorMaterial = FACE_MATERIAL;
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 5000);
        this.perspectiveCamera.position.set(12, CAMERA_ALTITUDE, 8);
        this.orbitControls = new this.OrbitControls(this.perspectiveCamera);
        this.orbitControls.target = new Vector3(0, CAMERA_ALTITUDE, 0);
        // this.orbitControls.maxPolarAngle = Math.PI / 2 * 0.95;
        this.rayCaster = new Raycaster();
        this.animate();
        this.keyboardListener();
    }

    public mouseMove(event: any) {
        if (!this.state.fabric) {
            return;
        }
        this.mouse.x = (event.clientX / this.state.width) * 2 - 1;
        this.mouse.y = -(event.clientY / this.state.height) * 2 + 1;
    }

    public trySelect(): boolean {
        this.rayCaster.setFromCamera(this.mouse, this.perspectiveCamera);
        // const intersect = this.rayCaster.intersectObject(this.facesMeshNode);
        // if (intersect.length > 0 && this.state.fabric) {
        //     const faceIndex = intersect[0].faceIndex / 3;
        //     if (this.state.selectedFaceIndex === undefined || faceIndex !== this.state.selectedFaceIndex) {
        //         this.setState({selectedFaceIndex: faceIndex});
        //     }
        //     return true;
        // }
        return false;
    }

    public render() {
        const facesGeometry = this.state.fabric ? this.state.fabric.facesGeometry : new BufferGeometry();
        const lineSegmentGeometry = this.state.fabric ? this.state.fabric.lineSegmentsGeometry : new BufferGeometry();
        const lightPosition = new Vector3().add(this.perspectiveCamera.position).add(LIGHT_ABOVE_CAMERA);
        return (
            <div onMouseMove={(e: any) => this.mouseMove(e)}>
                <R3.Renderer width={this.state.width} height={this.state.height}>
                    <R3.Scene width={this.state.width} height={this.state.height} camera={this.perspectiveCamera}>
                        <R3.Mesh
                            ref={(node: any) => this.facesMeshNode = node}
                            key="FabricFaces" name="Fabric"
                            geometry={facesGeometry}
                            material={FACE_MATERIAL}
                        />
                        <R3.LineSegments
                            key="FabricLines"
                            geometry={lineSegmentGeometry}
                            material={SPRING_MATERIAL}
                        />
                        <R3.Mesh
                            key="Floor"
                            geometry={new PlaneGeometry(1, 1)}
                            scale={new Vector3(1000, 1000, 1000)}
                            material={this.floorMaterial}
                            quaternion={new Quaternion().setFromAxisAngle(new Vector3(-1, 0, 0), Math.PI / 2)}
                        />
                        <R3.PointLight
                            name="Light"
                            key="Light"
                            distance="60"
                            decay="2"
                            position={lightPosition}
                        />
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

    private createFabricInstance(saveGenome: boolean) {
        this.stayHanging = HANG_DELAY;
        this.stayAlive = REBIRTH_DELAY;
        this.props.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, 80);
            const genome = (saveGenome && this.state.genome) ? this.state.genome : new Genome([], []);
            console.log(fabric.toString());
            fabric.createSeed(5, HANGER_ALTITUDE);
            this.setState({
                fabric,
                genome,
                growthExecution: genome.growthExecution(fabric),
                behaviorExecution: genome.behaviorExecution(fabric),
                paused: false
            });
        });
    }

    private animate() {
        const step = () => {
            setTimeout(
                () => {
                    if (!this.state.paused) {
                        if (this.state.fabric) {
                            const hanging: boolean = !!this.state.growthExecution || !!this.stayHanging;
                            const maxTimeIndex = this.state.fabric.iterate(100, hanging);
                            if (hanging) {
                                if (!this.state.growthExecution) {
                                    this.stayHanging--;
                                    if (!this.stayHanging) {
                                        this.state.fabric.removeHanger();
                                        this.setState({fabric: this.state.fabric});
                                    }
                                }
                            } else if (this.stayAlive > 0) {
                                this.state.fabric.centralize(-1, 0.02);
                                this.stayAlive--;
                            } else {
                                this.createFabricInstance(false);
                            }
                            if (this.state.growthExecution && maxTimeIndex === 0 && this.state.fabric.age > 100) {
                                if (!this.state.growthExecution.step()) {
                                    console.log('Growth finished');
                                    this.setState({growthExecution: undefined});
                                }
                            }
                        }
                        this.forceUpdate();
                    }
                    this.orbitControls.update();
                    requestAnimationFrame(step);
                },
                30
            );
        };
        requestAnimationFrame(step);
    }

    private keyboardListener() {
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                if (!this.state.paused) {
                    this.setState({paused: true});
                } else {
                    this.createFabricInstance(true);
                    this.setState({paused: false});
                }
            }
        })
    }
}

