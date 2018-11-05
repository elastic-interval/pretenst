import * as THREE from 'three';
import {PerspectiveCamera, Vector3} from 'three';
import * as ORBIT_CONTROLS from 'three-orbit-controls';
import {HUNG_ALTITUDE} from '../body/fabric';
import {HIGH_ALTITUDE} from './gotchi-view';

const OrbitControls = ORBIT_CONTROLS(THREE);
const NEAR_UP = new Vector3(0,1,0);
const TOWARDS_TARGET = 0.03;
const MAX_TARGET_SPEED = 2.5;

export class Orbit {
    private orbitControls: any;
    private vector = new Vector3();
    private target = new Vector3();

    constructor(domElement: any, private camera: PerspectiveCamera, target?: Vector3) {
        if (target) {
            this.target.add(target);
        }
        const orbit = this.orbitControls = new OrbitControls(camera, domElement);
        orbit.minPolarAngle = Math.PI * 0.1;
        orbit.maxPolarAngle = 0.95 * Math.PI / 2;
        orbit.maxDistance = HIGH_ALTITUDE;
        orbit.minDistance = 7;
        orbit.enableKeys = false;
        orbit.target = this.target;
    }

    public moveTargetTowards(location: Vector3) {
        this.vector.subVectors(location, this.target).multiplyScalar(TOWARDS_TARGET);
        if (this.vector.length() > MAX_TARGET_SPEED) {
            this.vector.setLength(MAX_TARGET_SPEED);
        }
        this.target.add(this.vector);
        if (this.camera.position.y < HUNG_ALTITUDE * 6) {
            this.camera.up.add(NEAR_UP).normalize();
        }
    }

    public update() {
        this.orbitControls.update();
    }
}