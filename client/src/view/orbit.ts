import * as THREE from 'three';
import {PerspectiveCamera, Vector3} from 'three';
import * as ORBIT_CONTROLS from 'three-orbit-controls';

const OrbitControls = ORBIT_CONTROLS(THREE);
const TOWARDS_TARGET = 0.03;

export class Orbit {
    private orbitControls: any;
    private towardsTarget = new Vector3();
    private target = new Vector3();

    constructor(domElement: any, camera: PerspectiveCamera, target?: Vector3) {
        if (target) {
            this.target.add(target);
        }
        const orbit = this.orbitControls = new OrbitControls(camera, domElement);
        orbit.minPolarAngle = Math.PI * 0.05;
        orbit.maxPolarAngle = Math.PI / 2;
        orbit.maxDistance = 1000;
        orbit.target = this.target;
    }

    public moveTargetTowards(location: Vector3) {
        this.towardsTarget.subVectors(location, this.target).multiplyScalar(TOWARDS_TARGET);
        if (this.towardsTarget.length() > 0.2) {
            this.towardsTarget.setLength(0.2);
        }
        this.target.add(this.towardsTarget);
    }

    public update() {
        this.orbitControls.update();
    }
}