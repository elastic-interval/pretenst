import * as React from 'react';
import * as R3 from 'react-three';
import {
    MeshBasicMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Quaternion,
    Raycaster,
    SphereGeometry,
    TextureLoader,
    Vector2,
    Vector3
} from 'three';
import {Interval} from './interval';
import {Fabric} from './fabric';
import {Physics} from './physics';
import {VerticalConstraints} from './vertical-constraints';
import {Face} from './face';

interface IPanoramaViewProps {
    width: number;
    height: number;
}

interface IPanoramaViewState {
    fabric: Fabric;
}

const faceMaterial = new MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.5});

export class EigView extends React.Component<IPanoramaViewProps, IPanoramaViewState> {
    private THREE = require('three');
    private OrbitControls = require('three-orbit-controls')(this.THREE);
    private geometry = new SphereGeometry(1, 11, 11);
    private ellipsoidUnitVector = new Vector3(0, 1, 0);
    private physics = new Physics(new VerticalConstraints());
    private intervalMaterial: MeshBasicMaterial;
    private floorMaterial: MeshBasicMaterial;
    private perspectiveCamera: PerspectiveCamera;
    private mouse = new Vector2();
    private orbitControls: any;
    private rayCaster: any;
    private nodesForSelection: any;
    private selectedFace?: Face;

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {fabric: new Fabric().tetra()};
        const loader = new TextureLoader();
        this.intervalMaterial = new MeshBasicMaterial({
            map: loader.load('/blue-red.png', (texture: any) => {
                // texture.wrapS = RepeatWrapping;
                // texture.wrapT = RepeatWrapping;
                // texture.offset.x = 90 / (2 * Math.PI);
            })
        });
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
                    this.state.fabric.faces.forEach(f => f.update());
                    this.setState({fabric: this.state.fabric});
                    this.orbitControls.update();
                    requestAnimationFrame(step);
                },
                20
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
            if (!this.selectedFace) {
                this.selectedFace = this.state.fabric.findFace(faceMesh.name);
                if (this.selectedFace) {
                    this.selectedFace.selected = true;
                }
            }
            else if (faceMesh.name !== this.selectedFace.name) {
                this.selectedFace.selected = false;
                this.selectedFace = this.state.fabric.findFace(faceMesh.name);
                if (this.selectedFace) {
                    this.selectedFace.selected = true;
                }
            }
        } else if (this.selectedFace) {
            this.selectedFace.selected = false;
            this.selectedFace = undefined;
        }
    }

    public mouseClick(event: any) {
        if (!this.selectedFace) {
            return;
        }
        this.state.fabric.tetraFace(this.selectedFace);
        this.state.fabric.centralize();
        this.selectedFace.selected = false;
        this.selectedFace = undefined;
    }

    public render() {
        return (
            <div onMouseMove={(e: any) => this.mouseMove(e)} onDoubleClick={(e: any) => this.mouseClick(e)}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        {this.state.fabric.intervals.map((interval: Interval, index: number) =>
                            <R3.Mesh
                                key={`I${index}`}
                                geometry={this.geometry}
                                material={this.intervalMaterial}
                                matrixAutoUpdate={false}
                                scale={new Vector3(0.05 * interval.span, interval.span * 0.5, 0.05 * interval.span)}
                                position={interval.location}
                                quaternion={new Quaternion().setFromUnitVectors(this.ellipsoidUnitVector, interval.unit)}
                            />
                        )}
                        <R3.Object3D ref={(node: any) => this.nodesForSelection = node}>
                            {this.state.fabric.faces.map((face: Face, index: number) =>
                                <R3.Mesh
                                    key={face.name}
                                    name={face.name}
                                    geometry={face.geometry}
                                    material={faceMaterial}
                                />
                            )}
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
