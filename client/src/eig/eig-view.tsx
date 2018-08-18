import * as React from 'react';
import * as R3 from 'react-three';
import {
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    Geometry,
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
import {EigFabric, IFabricExports, IFace, vectorFromIndex} from '../fabric';

interface IEigViewProps {
    createFabric: () => Promise<IFabricExports>;
}

interface IEigViewState {
    width: number;
    height: number;
    paused: boolean;
    selectedFace?: IFace;
    fabric?: EigFabric;
}

const FACE_MATERIAL = new MeshPhongMaterial({
    lights: true,
    color: new Color(0.9, 0.9, 0.9),
    transparent: true,
    opacity: 0.6,
    visible: true
});
const TRIPOD_MATERIAL = new LineBasicMaterial({color: 0xFFFFFF});
const SPRING_MATERIAL = new LineBasicMaterial({vertexColors: VertexColors});
const LIGHT_ABOVE_CAMERA = new Vector3(0, 3, 0);

export class EigView extends React.Component<IEigViewProps, IEigViewState> {
    private THREE = require('three');
    private OrbitControls = require('three-orbit-controls')(this.THREE);
    private floorMaterial: Material;
    private perspectiveCamera: PerspectiveCamera;
    private mouse = new Vector2();
    private orbitControls: any;
    private rayCaster: any;
    private facesMeshNode: any;

    constructor(props: IEigViewProps) {
        super(props);
        props.createFabric().then(fabricExports => {
            const fabric = new EigFabric(fabricExports, 200);
            console.log(`${(fabric.initBytes / 1024).toFixed(1)}k =becomes=> ${fabric.bytes / 65536} block(s)`);
            fabric.createSeed(5);
            fabric.centralize(1);
            this.setState({fabric});
        });
        this.state = {width: window.innerWidth, height: window.innerHeight, paused: false};
        this.floorMaterial = FACE_MATERIAL;
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 5000);
        this.perspectiveCamera.position.set(6, 1, 0);
        this.perspectiveCamera.lookAt(new Vector3(0, 1, 0));
        this.orbitControls = new this.OrbitControls(this.perspectiveCamera);
        // this.orbitControls.maxPolarAngle = Math.PI / 2 * 0.95;
        this.rayCaster = new Raycaster();
        const step = () => {
            setTimeout(
                () => {
                    if (this.state.fabric) {
                        if (!this.state.paused) {
                            this.state.fabric.iterate(60);
                            this.setState({fabric: this.state.fabric});
                        }
                        this.orbitControls.update();
                    }
                    requestAnimationFrame(step);
                },
                30
            );
        };
        requestAnimationFrame(step);
        window.addEventListener("keypress", (event: any) => {
            if (this.state.paused) {
                const fabric = this.state.fabric;
                if (fabric) {
                    if (this.state.selectedFace) {
                        fabric.createTetraFromFace(this.state.selectedFace);
                        fabric.centralize(0);
                        this.setState({selectedFace: undefined, paused: false});
                    } else {
                        for (let intervalIndex = 0; intervalIndex < fabric.intervalCount; intervalIndex++) {
                            fabric.setRandomIntervalRole(intervalIndex);
                        }
                        this.setState({paused: false});
                    }
                }
            } else {
                this.setState({paused: true});
                this.trySelect();
            }
        })
    }

    public mouseMove(event: any) {
        this.mouse.x = (event.clientX / this.state.width) * 2 - 1;
        this.mouse.y = -(event.clientY / this.state.height) * 2 + 1;
        if (this.state.paused) {
            if (this.trySelect()) {
                return;
            }
        }
        this.setState({selectedFace: undefined});
    }

    public trySelect(): boolean {
        this.rayCaster.setFromCamera(this.mouse, this.perspectiveCamera);
        const intersect = this.rayCaster.intersectObject(this.facesMeshNode);
        const selectedFace = this.state.selectedFace;
        const fabric = this.state.fabric;
        if (intersect.length > 0 && fabric) {
            const faceIndex = intersect[0].faceIndex / 3;
            if (!selectedFace || faceIndex !== selectedFace.index) {
                this.setState({selectedFace: fabric.getFace(faceIndex)});
            }
            return true;
        }
        return false;
    }

    public render() {
        const facesGeometry = new BufferGeometry();
        const lineSegmentGeometry = new BufferGeometry();
        const fabric = this.state.fabric;
        if (fabric) {
            lineSegmentGeometry.addAttribute('position', new Float32BufferAttribute(fabric.lineLocations, 3));
            lineSegmentGeometry.addAttribute('color', new Float32BufferAttribute(fabric.lineColors, 3));
            facesGeometry.addAttribute('position', new Float32BufferAttribute(fabric.faceLocations, 3));
            facesGeometry.addAttribute('normal', new Float32BufferAttribute(fabric.faceNormals, 3));
        }
        const lightPosition = new Vector3().add(this.perspectiveCamera.position).add(LIGHT_ABOVE_CAMERA);
        const faceNormalLineSegments = (fab: EigFabric, oldFace: IFace) => {
            const normalLine = new Geometry();
            const face = fab.getFace(oldFace.index);
            const apex = new Vector3().add(face.midpoint).addScaledVector(face.normal, Math.sqrt(2 / 3));
            const faceOffset = face.index * 3;
            normalLine.vertices = [
                vectorFromIndex(fab.faceLocations, faceOffset * 3), apex,
                vectorFromIndex(fab.faceLocations, (faceOffset + 1) * 3), apex,
                vectorFromIndex(fab.faceLocations, (faceOffset + 2) * 3), apex
            ];
            return <R3.LineSegments key="FaceNormal" geometry={normalLine} material={TRIPOD_MATERIAL}/>
        };
        const selectedFace = this.state.selectedFace;
        const selectedFaceTripod = !selectedFace ? null : fabric ? faceNormalLineSegments(fabric, selectedFace) : null;
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
                        {selectedFaceTripod}
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
}

