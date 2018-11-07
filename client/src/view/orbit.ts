import * as THREE from 'three';
import {PerspectiveCamera, Vector3} from 'three';
import * as ORBIT_CONTROLS from 'three-orbit-controls';
import {HIGH_ALTITUDE} from './gotchi-view';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

const OrbitControls = ORBIT_CONTROLS(THREE);
const HELICOPTER_DISTANCE = 160;
const UPWARDS = 0.3;

export enum OrbitState {
    HELICOPTER = 'HELICOPTER',
    CRUISE = 'CRUISE'
}

export class Orbit {
    private orbitControls: any;
    private vector = new Vector3();
    private target = new Vector3();
    private lastChanged = Date.now();

    constructor(domElement: any, private camera: PerspectiveCamera, private stateBehavior: BehaviorSubject<OrbitState>, target: Vector3) {
        const orbit = this.orbitControls = new OrbitControls(camera, domElement);
        orbit.minPolarAngle = Math.PI * 0.1;
        orbit.maxPolarAngle = 0.95 * Math.PI / 2;
        orbit.maxDistance = HIGH_ALTITUDE;
        orbit.minDistance = 7;
        orbit.enableKeys = false;
        orbit.target = this.target;
        // orbit.enablePan = false;
        // orbit.enableZoom = true;
        // orbit.enableDamping = true;
        // orbit.dampingFactor = 0.07;
        // orbit.rotateSpeed = 0.07;
        const updateLastChanged = () => this.lastChanged = Date.now();
        orbit.addEventListener('start', updateLastChanged);
        orbit.addEventListener('end', updateLastChanged);
        orbit.addEventListener('change', updateLastChanged);
        this.target.add(target);
    }

    public get changing(): boolean {
        return Date.now() - this.lastChanged < 100;
    }

    public moveTargetTowards(location: Vector3) {
        this.vector.subVectors(location, this.target);
        const maxTargetSpeed = this.distance / HELICOPTER_DISTANCE;
        if (this.vector.length() > maxTargetSpeed) {
            this.vector.setLength(maxTargetSpeed);
        }
        this.target.add(this.vector);
    }

    public update() {
        this.orbitControls.update();
        const distance = this.distance;
        if (distance < HELICOPTER_DISTANCE) {
            const up = this.camera.up;
            up.y += UPWARDS;
            up.normalize();
        }
        switch (this.stateBehavior.getValue()) {
            case OrbitState.HELICOPTER:
                if (distance < HELICOPTER_DISTANCE) {
                    this.stateBehavior.next(OrbitState.CRUISE);
                }
                break;
            case OrbitState.CRUISE:
                if (distance > HELICOPTER_DISTANCE) {
                    this.stateBehavior.next(OrbitState.HELICOPTER);
                }
                break;
        }
    }

    private get distance(): number {
        return this.camera.position.distanceTo(this.target);
    }
}