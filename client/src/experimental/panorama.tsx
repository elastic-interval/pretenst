import * as React from 'react';
import * as THREE from 'three';
import {Mesh, PerspectiveCamera, Renderer, Scene} from 'react-three'
import {setInterval} from "timers";

interface IPanoramaViewProps {
    width: number;
    height: number;
}

interface IPanoramaViewState {
    sphereGeometry: any;
    imageMaterial: any;
    cameraAngle: number;
}

export class Panorama extends React.Component<IPanoramaViewProps, IPanoramaViewState> {

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {
            sphereGeometry: new THREE.SphereGeometry(100, 32, 32),
            imageMaterial: new THREE.MeshBasicMaterial({
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
        const aspectratio = this.props.width / this.props.height;
        const cameraAngle = this.state.cameraAngle || 0;
        const cameraLookAt = new THREE.Vector3(
            Math.cos(cameraAngle),
            0,
            Math.sin(cameraAngle)
        );
        const cameraprops = {
            fov: 75,
            aspect: aspectratio,
            near: 1,
            far: 5000,
            position: new THREE.Vector3(0, 0, 0),
            lookat: cameraLookAt
        };
        const sphereProps = {
            geometry: this.state.sphereGeometry,
            material: this.state.imageMaterial,
            position: new THREE.Vector3(0, 0, 0),
            scale: new THREE.Vector3(1, 1, -1),
            quaternion: new THREE.Quaternion()
        };
        return (
            <Renderer width={this.props.width} height={this.props.height}>
                <Scene width={this.props.width} height={this.props.height} camera="maincamera">
                    <PerspectiveCamera name="maincamera" {...cameraprops} />
                    <Mesh {...sphereProps}/>
                </Scene>
            </Renderer>
        );
    }
}
