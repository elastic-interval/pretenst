import * as THREE from 'three';
import {PerspectiveCamera, Vector3} from 'three';
import * as ORBIT_CONTROLS from 'three-orbit-controls';

const OrbitControls = ORBIT_CONTROLS(THREE);
// const FAR_UP = new Vector3(0,0,-1);
const NEAR_UP = new Vector3(0,1,0);
const TOWARDS_TARGET = 0.03;
const MAX_TARGET_SPEED = 2.5;
const TOO_FAR_DISTANCE = 200;
const TOO_FAR_HEIGHT = 300;
const TOO_FAR_XZ = 10;

export class Orbit {
    public tooFar = false;
    private orbitControls: any;
    private targetMove = new Vector3();
    private cameraMove = new Vector3();
    private target = new Vector3();

    constructor(domElement: any, private camera: PerspectiveCamera, target?: Vector3) {
        if (target) {
            this.target.add(target);
        }
        const orbit = this.orbitControls = new OrbitControls(camera, domElement);
        orbit.minPolarAngle = Math.PI * 0.05;
        orbit.maxPolarAngle = Math.PI / 2;
        orbit.maxDistance = 1000;
        orbit.minDistance = 7;
        orbit.enableKeys = false;
        orbit.target = this.target;
    }

    public moveTargetTowards(location: Vector3) {
        this.targetMove.subVectors(location, this.target).multiplyScalar(TOWARDS_TARGET);
        if (this.targetMove.length() > MAX_TARGET_SPEED) {
            this.targetMove.setLength(MAX_TARGET_SPEED);
        }
        const before = this.cameraMove.subVectors(this.target, this.camera.position).length();
        this.tooFar = before > TOO_FAR_DISTANCE;
        if (this.tooFar) {
            const distanceXZ = Math.sqrt(this.camera.position.x * location.x + this.camera.position.z * location.x);
            if (this.camera.position.y < TOO_FAR_HEIGHT || distanceXZ > TOO_FAR_XZ) {
                let toTravel = this.cameraMove.set(location.x, TOO_FAR_HEIGHT, location.z).sub(this.camera.position).length();
                if (toTravel > MAX_TARGET_SPEED * 10) {
                    toTravel = MAX_TARGET_SPEED * 10;
                }
                this.cameraMove.setLength(toTravel);
                this.camera.position.add(this.cameraMove);
            }
            // this.camera.up.add(FAR_UP).normalize();
        } else {
            this.camera.up.add(NEAR_UP).normalize();
        }
        this.target.add(this.targetMove);
        const after = this.cameraMove.subVectors(this.target, this.camera.position).length();
        const scale = after - before;
        this.camera.position.addScaledVector(this.cameraMove.normalize(), scale);
    }

    public update() {
        this.orbitControls.update();
    }
}