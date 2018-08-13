import * as React from 'react';
import * as R3 from 'react-three';
import {
    BufferAttribute,
    BufferGeometry,
    CircleGeometry,
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
    width: number;
    height: number;
    fabricFactory: () => Promise<IFabricExports>;
}

interface IEigViewState {
    fabric?: EigFabric;
}

const upVector = new Vector3(0, 0, 1);
const faceGeometry = new CircleGeometry(0.25, 24);
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
    private nodesForSelection: any;
    private selectedFaceIndex = -1;

    constructor(props: IEigViewProps) {
        super(props);
        props.fabricFactory().then(fabricExports => {
            const fabric = new EigFabric(fabricExports, 200, 600, 400);
            console.log(`${(fabric.initBytes / 1024).toFixed(1)}k =becomes=> ${fabric.bytes / 65536} block(s)`);
            fabric.createOctahedron();
            // fabric.createTetrahedron();
            fabric.centralize(2);
            this.state = {fabric};
        });
        this.state = {};
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
        this.perspectiveCamera = new PerspectiveCamera(50, this.props.width / this.props.height, 1, 5000);
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
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.perspectiveCamera);
        const intersect = this.rayCaster.intersectObjects(this.nodesForSelection.children);
        if (intersect.length > 0) {
            const faceMesh = intersect[0].object;
            const faceIndex = parseInt(faceMesh.name, 10);
            if (this.selectedFaceIndex < 0 || faceIndex !== this.selectedFaceIndex) {
                this.selectedFaceIndex = faceIndex;
                // const fabric = this.state.fabric;
                // if (fabric) {
                //     const face = fabric.getFace(this.selectedFaceIndex);
                //     console.log(`face ${face.index}`, face.jointTag);
                // }
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
        const fabricGeometry = new BufferGeometry();
        const fabric = this.state.fabric;
        const faces: any[] = [];
        if (fabric) {
            fabricGeometry.addAttribute('position', new BufferAttribute(fabric.lines, 3));
            const midpoints = fabric.midpoints;
            const normals = fabric.normals;
            const faceCount = fabric.faces();
            for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
                const faceBase = faceIndex * 3;
                const midpoint = new Vector3(midpoints[faceBase], midpoints[faceBase + 1], midpoints[faceBase + 2]);
                const normal = new Vector3(normals[faceBase], normals[faceBase + 1], normals[faceBase + 2]);
                faces.push({
                    name: `F${faceIndex}`,
                    position: midpoint,
                    quaternion: new Quaternion().setFromUnitVectors(upVector, normal)
                });
            }
        }
        const faceMeshes = faces.map((face: any, index: number) => {
            // if (this.selectedFace && face.name === this.selectedFace.name) {
            return <R3.Mesh
                key={face.name} name={index}
                geometry={faceGeometry}
                material={faceVisibleMaterial}
                position={face.position}
                quaternion={face.quaternion}
            />
        });
        return (
            <div onMouseMove={(e: any) => this.mouseMove(e)} onDoubleClick={(e: any) => this.mouseClick(e)}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <R3.LineSegments key="Fabric" geometry={fabricGeometry} material={lineMaterial}/>
                        <R3.Object3D key="Faces" ref={(node: any) => this.nodesForSelection = node}>
                            {faceMeshes}
                        </R3.Object3D>
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
}

