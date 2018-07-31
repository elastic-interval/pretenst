import * as React from 'react';
import * as THREE from 'three';
import {Mesh, PerspectiveCamera, Renderer, Scene} from 'react-three';

interface IPanoramaViewProps {
    width: number;
    height: number;
}

interface IPanoramaViewState {
    cameraAngle: number;
    textureLoaded: boolean;
}

export class Panorama extends React.Component<IPanoramaViewProps, IPanoramaViewState> {

    private geometry = new THREE.SphereGeometry(1, 11, 11);
    private scale = new THREE.Vector3(0.1, 1, 0.1);
    private material: any;

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {
            cameraAngle: 0,
            textureLoaded: false
        };
        new THREE.TextureLoader().load(
            '/spherePanorama.jpg',
            this.onTextureLoaded,
            (xhr: any) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
            () => console.log('An error happened')
        );
    }

    public render() {
        const far = 1.5;
        const position = new THREE.Vector3(
            Math.cos(this.state.cameraAngle) * far,
            Math.sin(this.state.cameraAngle) * -far,
            Math.sin(this.state.cameraAngle) * far
        );
        const mesh = !this.material ? null : React.createElement(Mesh, {
            geometry: this.geometry,
            material: this.material,
            matrixAutoUpdate: false,
            scale: this.scale
        });
        return (
            <Renderer width={this.props.width} height={this.props.height}>
                <Scene width={this.props.width} height={this.props.height} camera="maincamera">
                    <PerspectiveCamera
                        name="maincamera"
                        fov={75}
                        aspect={this.props.width / this.props.height}
                        near={1}
                        far={5000}
                        position={position}
                        lookat={new THREE.Vector3(0, 0, 0)}
                    />
                    {mesh}
                </Scene>
            </Renderer>
        );
    }

    private onTextureLoaded = (texture: any) => {
        // do something with the texture
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.offset.x = 90 / (2 * Math.PI);
        this.material = new THREE.MeshBasicMaterial({map: texture});
        this.setState({textureLoaded: true});
        setInterval(
            () => this.setState({cameraAngle: this.state.cameraAngle + 0.1}),
            50
        );
    };
}
