import * as React from 'react';
import * as R3 from 'react-three';
import {
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
import {Fabric} from './fabric';
import {Physics} from './physics';
import {VerticalConstraints} from './vertical-constraints';
import {Face} from './face';
import {IEigWasm} from '../index';

interface IPanoramaViewProps {
    width: number;
    height: number;
    eigWasm: IEigWasm;
}

interface IPanoramaViewState {
    fabric: Fabric;
}

const faceInvisibleMaterial = new MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.1});
const faceVisibleMaterial = new MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.5});
const lineMaterial = new LineBasicMaterial({color: 0xff0000});

export class EigView extends React.Component<IPanoramaViewProps, IPanoramaViewState> {
    private THREE = require('three');
    private OrbitControls = require('three-orbit-controls')(this.THREE);
    private physics = new Physics(new VerticalConstraints());
    private floorMaterial: MeshBasicMaterial;
    private perspectiveCamera: PerspectiveCamera;
    private mouse = new Vector2();
    private orbitControls: any;
    private rayCaster: any;
    private nodesForSelection: any;
    private selectedFace?: Face;

    constructor(props: IPanoramaViewProps) {
        super(props);
        console.log('summa from eig view eleven', props.eigWasm.summa(5, 6));
        this.state = {fabric: new Fabric().tetra()};
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
        this.perspectiveCamera.position.set(12, 3, 0);
        this.perspectiveCamera.lookAt(new Vector3(0, 0, 0));
        this.orbitControls = new this.OrbitControls(this.perspectiveCamera);
        this.orbitControls.maxPolarAngle = Math.PI / 2 * 0.95;
        this.rayCaster = new Raycaster();
        const step = () => {
            setTimeout(
                () => {
                    for (let tick = 0; tick < 12; tick++) {
                        this.physics.iterate(this.state.fabric);
                    }
                    this.setState({fabric: this.state.fabric});
                    this.orbitControls.update();
                    requestAnimationFrame(step);
                },
                30
            );
        };
        // fetch(‘fib.wasm’).then(response =>
        //     response.arrayBuffer()
        // ).then(bytes =>
        //     WebAssembly.instantiate(bytes, {imports: {}})
        // ).then(results => {
        //     window.fib = results.instance.exports.fib;
        // });
        requestAnimationFrame(step);
    }

    public mouseMove(event: any) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.rayCaster.setFromCamera(this.mouse, this.perspectiveCamera);
        const intersect = this.rayCaster.intersectObjects(this.nodesForSelection.children);
        if (intersect.length > 0) {
            const faceMesh = intersect[0].object;
            if (!this.selectedFace || faceMesh.name !== this.selectedFace.name) {
                this.selectedFace = this.state.fabric.findFace(faceMesh.name);
            }
        } else if (this.selectedFace) {
            this.selectedFace = undefined;
        }
    }

    public mouseClick(event: any) {
        if (!this.selectedFace) {
            return;
        }
        this.state.fabric.tetraFace(this.selectedFace);
        this.state.fabric.centralize();
        this.selectedFace = undefined;
    }

    public render() {
        return (
            <div onMouseMove={(e: any) => this.mouseMove(e)} onDoubleClick={(e: any) => this.mouseClick(e)}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <R3.LineSegments
                            key="Fabric"
                            geometry={this.state.fabric.lineSegmentGeometry}
                            material={lineMaterial}
                        />
                        <R3.Object3D ref={(node: any) => this.nodesForSelection = node}>
                            {this.state.fabric.faces.map((face: Face, index: number) => {
                                    if (this.selectedFace && face.name === this.selectedFace.name) {
                                        return [
                                            <R3.Mesh
                                                key={face.name} name={face.name}
                                                geometry={face.triangleGeometry}
                                                material={faceVisibleMaterial}
                                            />,
                                            <R3.LineSegments
                                                key={face.name + 'T'} name={face.name}
                                                geometry={face.tripodGeometry}
                                                material={lineMaterial}
                                            />
                                        ]
                                    } else {
                                        return <R3.Mesh
                                            key={face.name} name={face.name}
                                            geometry={face.triangleGeometry}
                                            material={(this.selectedFace && face.name === this.selectedFace.name) ? faceVisibleMaterial : faceInvisibleMaterial}
                                        />
                                    }
                                }
                            )}
                        </R3.Object3D>
                        {/*geometry={(this.selectedFace && face.name === this.selectedFace.name) ? face.tripodGeometry : face.triangleGeometry}*/}
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
