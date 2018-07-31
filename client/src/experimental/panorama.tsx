import * as React from 'react';
import * as THREE from 'three';
import {Mesh, PerspectiveCamera, Renderer, Scene} from 'react-three'
import {setInterval} from "timers";

interface IPanoramaViewProps {
    width: number;
    height: number;
}

interface IPanoramaViewState {
    material: any;
    cameraAngle: number;
}

export class Panorama extends React.Component<IPanoramaViewProps, IPanoramaViewState> {

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {
            material: new THREE.MeshBasicMaterial({
                map: THREE.ImageUtils.loadTexture('/spherePanorama.jpg')
            }),
            cameraAngle: 0
        };
        setInterval(
            () => {
                this.setState({cameraAngle: this.state.cameraAngle + 0.001});
            },
            100
        );
    }

    public render() {
        const lookat = new THREE.Vector3(
            Math.cos(this.state.cameraAngle), 0, Math.sin(this.state.cameraAngle)
        );
        return (
            <Renderer width={this.props.width} height={this.props.height}>
                <Scene width={this.props.width} height={this.props.height} camera="maincamera">
                    <PerspectiveCamera
                        name="maincamera"
                        fov={75}
                        aspect={this.props.width / this.props.height}
                        near={1}
                        far={5000}
                        position={new THREE.Vector3(0, 0, 0)}
                        lookat={lookat}
                    />
                    <Mesh
                        geometry={new THREE.SphereGeometry(100, 32, 32)}
                        material={this.state.material}
                        position={new THREE.Vector3(0, 0, 0)}
                        scale={new THREE.Vector3(1, 1, -1)}
                    />
                </Scene>
            </Renderer>
        );
    }
}
