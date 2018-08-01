import * as React from 'react';
import * as R3 from 'react-three';
import {MeshBasicMaterial, Quaternion, RepeatWrapping, SphereGeometry, TextureLoader, Vector3} from 'three';

interface IPanoramaViewProps {
    width: number;
    height: number;
}

interface IPanoramaViewState {
    cameraAngle: number;
    textureLoaded: boolean;
}

interface Interval {
    a: Vector3;
    b: Vector3;
}

export class Panorama extends React.Component<IPanoramaViewProps, IPanoramaViewState> {

    private geometry = new SphereGeometry(1, 11, 11);
    private ellipsoidScale = new Vector3(0.1, 1.31, 0.1);
    private sphereScale = new Vector3(0.03, 0.03, 0.03);
    private joints: Vector3[] = [];
    private intervals: Interval[] = [];
    private material: any;

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {
            cameraAngle: 0,
            textureLoaded: false
        };
        new TextureLoader().load(
            '/spherePanorama.jpg',
            this.onTextureLoaded,
            (xhr: any) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
            () => console.log('An error happened')
        );
        const joint = (x: number, y: number, z: number) => this.joints.push(new Vector3(x, y, z));
        joint(1, -1, 1);
        joint(-1, 1, 1);
        joint(-1, -1, -1);
        joint(1, 1, -1);
        const interval = (a: number, b: number) => this.intervals.push({a: this.joints[a], b: this.joints[b]});
        interval(0, 1);
        interval(0, 2);
        interval(0, 3);
        interval(1, 2);
        interval(1, 3);
        interval(2, 3);
    }

    public render() {
        const far = 3;
        const position = new Vector3(
            Math.cos(this.state.cameraAngle) * far,
            Math.sin(this.state.cameraAngle) * -far,
            Math.sin(this.state.cameraAngle) * far
        );
        const originalUnit = new Vector3(0,1,0);
        const intervalToEllipsoid = (interval: Interval) => {
            const intervalUnit = new Vector3().add(interval.b).sub(interval.a).normalize();
            return React.createElement(R3.Mesh, {
                geometry: this.geometry,
                material: this.material,
                matrixAutoUpdate: false,
                scale: this.ellipsoidScale,
                position: new Vector3().add(interval.a).add(interval.b).multiplyScalar(0.5),
                quaternion: new Quaternion().setFromUnitVectors(originalUnit, intervalUnit)
            });
        };
        const jointToSphere = (joint: Vector3) => {
            return React.createElement(R3.Mesh, {
                geometry: this.geometry,
                material: this.material,
                matrixAutoUpdate: false,
                scale: this.sphereScale,
                position: joint
            });

        };
        const ellipsoidArray = !this.material ? null : this.intervals.map(intervalToEllipsoid);
        const sphereArray = !this.material ? null : this.joints.map(jointToSphere);
        return (
            <R3.Renderer width={this.props.width} height={this.props.height}>
                <R3.Scene width={this.props.width} height={this.props.height} camera="maincamera">
                    <R3.PerspectiveCamera
                        name="maincamera"
                        fov={75}
                        aspect={this.props.width / this.props.height}
                        near={1}
                        far={5000}
                        position={position}
                        lookat={new Vector3(0, 0, 0)}
                    />
                    {sphereArray}
                    {ellipsoidArray}
                </R3.Scene>
            </R3.Renderer>
        );
    }

    private onTextureLoaded = (texture: any) => {
        // do something with the texture
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.offset.x = 90 / (2 * Math.PI);
        this.material = new MeshBasicMaterial({map: texture});
        this.setState({textureLoaded: true});
        setInterval(
            () => this.setState({cameraAngle: this.state.cameraAngle + 0.01}),
            30
        );
    };
}
