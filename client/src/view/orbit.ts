import * as THREE from 'three';
import {PerspectiveCamera, Vector3} from 'three';
import * as ORBIT_CONTROLS from 'three-orbit-controls';
import {HUNG_ALTITUDE} from '../body/fabric';
import {HIGH_ALTITUDE} from './gotchi-view';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

const OrbitControls = ORBIT_CONTROLS(THREE);
const TOWARDS_TARGET = 0.03;
const MAX_TARGET_SPEED = 2.5;
const HELICOPTER_ALTITUDE = 300;
const VERTICAL_ALTITUDE = HUNG_ALTITUDE * 6;
const UPWARDS = 0.3;

export enum OrbitState {
    HELICOPTER = 'HELICOPTER',
    CRUISE = 'CRUISE'
}

export class Orbit {
    public changing = false;
    private orbitControls: any;
    private vector = new Vector3();
    private target = new Vector3();

    constructor(domElement: any, private camera: PerspectiveCamera, private stateBehavior: BehaviorSubject<OrbitState>, target: Vector3) {
        const orbit = this.orbitControls = new OrbitControls(camera, domElement);
        orbit.minPolarAngle = Math.PI * 0.1;
        orbit.maxPolarAngle = 0.95 * Math.PI / 2;
        orbit.maxDistance = HIGH_ALTITUDE;
        orbit.minDistance = 7;
        orbit.enableKeys = false;
        orbit.target = this.target;
        orbit.addEventListener('start', (event: any) => this.changing = true);
        orbit.addEventListener('end', (event: any) => this.changing = false);
        this.target.add(target);
    }

    public moveTargetTowards(location: Vector3) {
        this.vector.subVectors(location, this.target).multiplyScalar(TOWARDS_TARGET);
        if (this.vector.length() > MAX_TARGET_SPEED) {
            this.vector.setLength(MAX_TARGET_SPEED);
        }
        this.target.add(this.vector);
    }

    public update() {
        this.orbitControls.update();
        // const distance = this.vector.subVectors(this.target, this.camera.position).length();
        const altitude = this.camera.position.y;
        if (altitude < VERTICAL_ALTITUDE) {
            const up = this.camera.up;
            up.y += UPWARDS;
            up.normalize();
        }
        switch (this.stateBehavior.getValue()) {
            case OrbitState.HELICOPTER:
                if (altitude < HELICOPTER_ALTITUDE) {
                    console.log('cruise!');
                    this.stateBehavior.next(OrbitState.CRUISE);
                }
                break;
            case OrbitState.CRUISE:
                if (altitude > HELICOPTER_ALTITUDE) {
                    this.stateBehavior.next(OrbitState.HELICOPTER);
                }
                break;
        }
    }
}