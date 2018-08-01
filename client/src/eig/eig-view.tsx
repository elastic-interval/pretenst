import * as React from 'react';
import * as R3 from 'react-three';
import {
    MeshBasicMaterial,
    PlaneGeometry,
    Quaternion,
    RepeatWrapping,
    SphereGeometry,
    TextureLoader,
    Vector3
} from 'three';
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
    fabric: Fabric;
}

export class EigView extends React.Component<IPanoramaViewProps, IPanoramaViewState> {

    private geometry = new SphereGeometry(1, 11, 11);
    private ellipsoidUnitVector = new Vector3(0, 1, 0);
    private sphereScale = new Vector3(0.03, 0.03, 0.03);
    private physics = new Physics(new VerticalConstraints());
    private ellipsoidMaterial: any;
    private floorMaterial: any;

    constructor(props: IPanoramaViewProps) {
        super(props);
        this.state = {
            cameraAngle: 0,
            fabric: new Fabric().tetra()
        };

        const loader = new TextureLoader();
        this.ellipsoidMaterial = new MeshBasicMaterial({
            map: loader.load('/spherePanorama.jpg', (texture: any) => {
                texture.wrapS = RepeatWrapping;
                texture.wrapT = RepeatWrapping;
                texture.offset.x = 90 / (2 * Math.PI);
            })
        });
        this.floorMaterial = new MeshBasicMaterial({
            map: loader.load('/water.jpg', (texture: any) => {
                texture.wrapS = RepeatWrapping;
                texture.wrapT = RepeatWrapping;
            })
        });
        const step = () => {
            setTimeout(
                () => {
                    for (let tick = 0; tick < 12; tick++) {
                        this.physics.iterate(this.state.fabric);
                    }
                    this.setState({
                        cameraAngle: this.state.cameraAngle + 0.001,
                        fabric: this.state.fabric
                    });
                    requestAnimationFrame(step);
                },
                20
            );
        };
        requestAnimationFrame(step);
    }

    public render() {
        const cameraDistance = 8;
        const cameraPosition = new Vector3(
            Math.cos(this.state.cameraAngle) * cameraDistance,
            1,
            Math.sin(this.state.cameraAngle) * cameraDistance
        );
        const intervalToEllipsoid = (interval: Interval, index: number): React.ReactElement<any> => {
            return React.createElement(R3.Mesh, {
                key: `I${index}`,
                geometry: this.geometry,
                material: this.ellipsoidMaterial,
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
                material: this.ellipsoidMaterial,
                matrixAutoUpdate: false,
                scale: this.sphereScale,
                position: joint.location
            });
        };
        const ellipsoidArray = !this.ellipsoidMaterial ? null : this.state.fabric.intervals.map(intervalToEllipsoid);
        const sphereArray = !this.ellipsoidMaterial ? null : this.state.fabric.joints.map(jointToSphere);
        const floor = !this.ellipsoidMaterial ? null : React.createElement(R3.Mesh, {
            key: 'Floor',
            geometry: new PlaneGeometry(1, 1),
            scale: new Vector3(20, 20, 20),
            material: this.floorMaterial,
            quaternion: new Quaternion().setFromAxisAngle(new Vector3(-1, 0, 0), Math.PI / 2)
        });
        return (
            <R3.Renderer width={this.props.width} height={this.props.height}>
                <R3.Scene width={this.props.width} height={this.props.height} camera="maincamera">
                    <R3.PerspectiveCamera
                        name="maincamera"
                        fov={50}
                        aspect={this.props.width / this.props.height}
                        near={1}
                        far={5000}
                        position={cameraPosition}
                        lookat={new Vector3(0, 0, 0)}
                    />
                    {sphereArray}
                    {ellipsoidArray}
                    {floor}
                </R3.Scene>
            </R3.Renderer>
        );
    }
}
