import * as React from 'react';
import * as R3 from 'react-three';
import {MeshBasicMaterial, Quaternion, RepeatWrapping, SphereGeometry, TextureLoader, Vector3} from 'three';
import {Interval} from './interval';
import {Joint} from './joint';
import {Fabric} from './fabric';
import {Physics} from './physics';
import {VerticalConstraints} from './vertical-constraints';

interface IPanoramaViewProps {
    width: number;
    height: number;
}

interface IPanoramaViewState {
    cameraAngle: number;
    textureLoaded: boolean;
    fabric: Fabric;
}

export class EigView extends React.Component<IPanoramaViewProps, IPanoramaViewState> {

    private geometry = new SphereGeometry(1, 11, 11);
    private ellipsoidUnitVector = new Vector3(0, 1, 0);
    private sphereScale = new Vector3(0.03, 0.03, 0.03);
    private physics = new Physics(new VerticalConstraints(), 16);
    private material: any;

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {
            cameraAngle: 0,
            textureLoaded: false,
            fabric: new Fabric().tetra()
        };
        new TextureLoader().load(
            '/spherePanorama.jpg',
            this.onTextureLoaded,
            (xhr: any) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
            () => console.log('An error happened')
        );
    }

    public render() {
        const cameraDistance = 3;
        const cameraPosition = new Vector3(
            Math.cos(this.state.cameraAngle) * cameraDistance,
            1,
            Math.sin(this.state.cameraAngle) * cameraDistance
        );
        const intervalToEllipsoid = (interval: Interval, index: number): React.ReactElement<any> => {
            return React.createElement(R3.Mesh, {
                key: `I${index}`,
                geometry: this.geometry,
                material: this.material,
                matrixAutoUpdate: false,
                scale: new Vector3(0.05 * interval.span, interval.span * 0.5, 0.05 * interval.span),
                position: interval.location,
                quaternion: new Quaternion().setFromUnitVectors(this.ellipsoidUnitVector, interval.unit)
            });
        };
        const jointToSphere = (joint: Joint, index: number): React.ReactElement<any> => {
            return React.createElement(R3.Mesh, {
                key: `J${index}`,
                geometry: this.geometry,
                material: this.material,
                matrixAutoUpdate: false,
                scale: this.sphereScale,
                position: joint.location
            });
        };
        const ellipsoidArray = !this.material ? null : this.state.fabric.intervals.map(intervalToEllipsoid);
        const sphereArray = !this.material ? null : this.state.fabric.joints.map(jointToSphere);
        return (
            <R3.Renderer width={this.props.width} height={this.props.height}>
                <R3.Scene width={this.props.width} height={this.props.height} camera="maincamera">
                    <R3.PerspectiveCamera
                        name="maincamera"
                        fov={75}
                        aspect={this.props.width / this.props.height}
                        near={1}
                        far={5000}
                        position={cameraPosition}
                        lookat={new Vector3(0, 0, 0)}
                    />
                    {sphereArray}
                    {ellipsoidArray}
                </R3.Scene>
            </R3.Renderer>
        );
    }

    private onTextureLoaded = (texture: any) => {
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.offset.x = 90 / (2 * Math.PI);
        this.material = new MeshBasicMaterial({map: texture});
        this.setState({textureLoaded: true});
        setInterval(
            () => {
                this.physics.transform(this.state.fabric);
                this.setState({
                    cameraAngle: this.state.cameraAngle + 0.01,
                    fabric: this.state.fabric
                });
            },
            30
        );
    };
}
