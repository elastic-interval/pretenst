import * as React from 'react';
import * as R3 from 'react-three';
import {
    BufferGeometry,
    Float32BufferAttribute,
    LineBasicMaterial,
    MeshBasicMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Quaternion,
    Raycaster,
    TextureLoader,
    Vector2,
    Vector3
} from 'three';
import {EigFabric, IFabricExports} from '../fabric';

interface IEigViewProps {
    fabricFactory: () => Promise<IFabricExports>;
}

interface IEigViewState {
    width: number;
    height: number;
    fabric?: EigFabric;
}

// const upVector = new Vector3(0, 0, 1);
// const circleGeometry = new CircleGeometry(0.25, 24);
// const faceInvisibleMaterial = new MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.1});
const faceVisibleMaterial = new MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.5});
const lineMaterial = new LineBasicMaterial({color: 0xff0000});

export class EigView extends React.Component<IEigViewProps, IEigViewState> {
    private THREE = require('three');
    private OrbitControls = require('three-orbit-controls')(this.THREE);
    private floorMaterial: MeshBasicMaterial;
    private perspectiveCamera: PerspectiveCamera;
    private mouse = new Vector2();
    private orbitControls: any;
    private rayCaster: any;
    private selectedFaceIndex = -1;
    private facesMeshNode: any;

    constructor(props: IEigViewProps) {
        super(props);
        props.fabricFactory().then(fabricExports => {
            const fabric = new EigFabric(fabricExports, 180, 400, 350);
            console.log(`${(fabric.initBytes / 1024).toFixed(1)}k =becomes=> ${fabric.bytes / 65536} block(s)`);
            fabric.createOctahedron();
            // fabric.createTetrahedron();
            fabric.centralize(2);
            this.setState({fabric});
        });
        this.state = {width: window.innerWidth, height: window.innerHeight};
        const loader = new TextureLoader();
        this.floorMaterial = new MeshBasicMaterial({
            map: loader.load('/grass.jpg', (texture: any) => {
                texture.transparent = true;
                texture.opacity = 0.9;
                // texture.wrapS = RepeatWrapping;
                // texture.wrapT = RepeatWrapping;
                // texture.repeat.set( 12, 12 );
            })
        });
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 5000);
        this.perspectiveCamera.position.set(6, 1, 0);
        this.perspectiveCamera.lookAt(new Vector3(0, 1, 0));
        this.orbitControls = new this.OrbitControls(this.perspectiveCamera);
        this.orbitControls.maxPolarAngle = Math.PI / 2 * 0.95;
        this.rayCaster = new Raycaster();
        const step = () => {
            setTimeout(
                () => {
                    if (this.state.fabric) {
                        this.state.fabric.iterate(100);
                        this.setState({fabric: this.state.fabric});
                        this.orbitControls.update();
                    }
                    requestAnimationFrame(step);
                },
                30
            );
        };
        requestAnimationFrame(step);
    }

    public mouseMove(event: any) {
        this.mouse.x = (event.clientX / this.state.width) * 2 - 1;
        this.mouse.y = -(event.clientY / this.state.height) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.perspectiveCamera);
        const intersect = this.rayCaster.intersectObject(this.facesMeshNode);
        if (intersect.length > 0) {
            const faceIndex = intersect[0].faceIndex / 3;
            if (faceIndex !== this.selectedFaceIndex) {
                this.selectedFaceIndex = faceIndex;
            }
        } else if (this.selectedFaceIndex >= 0) {
            this.selectedFaceIndex = -1;
        }
    }

    public mouseClick(event: any) {
        if (this.selectedFaceIndex < 0) {
            return;
        }
        const fabric = this.state.fabric;
        if (fabric) {
            const face = fabric.getFace(this.selectedFaceIndex);
            console.log('create from face', face);
            fabric.createTetraFromFace(face);
            fabric.centralize(-1);
        }
        this.selectedFaceIndex = -1;
    }

    public render() {
        const facesGeometry = new BufferGeometry();
        const lineSegmentGeometry = new BufferGeometry();
        const fabric = this.state.fabric;
        if (fabric) {
            lineSegmentGeometry.addAttribute('position', new Float32BufferAttribute(fabric.linePairs, 3));
            facesGeometry.addAttribute('position', new Float32BufferAttribute(fabric.faceLocations, 3));
            facesGeometry.addAttribute('normal', new Float32BufferAttribute(fabric.faceNormals, 3));
        }
        return (
            <div onMouseMove={(e: any) => this.mouseMove(e)} onDoubleClick={(e: any) => this.mouseClick(e)}>
                <R3.Renderer width={this.state.width} height={this.state.height}>
                    <R3.Scene width={this.state.width} height={this.state.height} camera={this.perspectiveCamera}>
                        <R3.Mesh
                            ref={(node: any) => this.facesMeshNode = node}
                            key="FabricFaces" name="Fabric"
                            geometry={facesGeometry}
                            material={faceVisibleMaterial}
                        />
                        <R3.LineSegments key="FabricLines" geometry={lineSegmentGeometry} material={lineMaterial}/>
                        <R3.Mesh
                            key="Floor"
                            geometry={new PlaneGeometry(1, 1)}
                            scale={new Vector3(10, 10, 10)}
                            material={this.floorMaterial}
                            quaternion={new Quaternion().setFromAxisAngle(new Vector3(-1, 0, 0), Math.PI / 2)}
                        />
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

