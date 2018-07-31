import * as React from 'react';
import * as THREE from 'three';
import {Mesh, PerspectiveCamera, Renderer, Scene} from 'react-three'
import {setInterval} from "timers";

interface IPanoramaViewProps {
    width: number;
    height: number;
}

interface IPanoramaViewState {
    cameraAngle: number;
    material?: any;
}

export class Panorama extends React.Component<IPanoramaViewProps, IPanoramaViewState> {

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {cameraAngle: 0};
        new THREE.TextureLoader().load(
            '/spherePanorama.jpg',
            this.textureLoaded,
            (xhr: any) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            () => {
                console.log('An error happened');
            }
        );
        setInterval(
            () => {
                this.setState({cameraAngle: this.state.cameraAngle + 0.001});
            },
            100
        );
    }

    public render() {
        const far = 18.0;
        const position = new THREE.Vector3(
            Math.cos(this.state.cameraAngle) * far, 0, Math.sin(this.state.cameraAngle) * far
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
                        position={position}
                        lookat={new THREE.Vector3(0, 0, 0)}
                    />
                    {
                        !this.state.material ? null :
                            <Mesh
                                geometry={new THREE.SphereGeometry(100, 32, 32)}
                                material={this.state.material}
                                position={new THREE.Vector3(0, 0, 0)}
                                scale={new THREE.Vector3(0.1, 0.1, 0.1)}
                            />
                    }
                </Scene>
            </Renderer>
        );
    }

    private textureLoaded = (texture: any) => {
        // do something with the texture
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.offset.x = 90 / (2 * Math.PI);
        // material.map = texture; // set the material's map when when the texture is loaded
        this.setState({
            material: new THREE.MeshBasicMaterial({
                map: texture
            })
        });
    };
}
