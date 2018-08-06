import {Joint} from './joint';
import {Fabric} from './fabric';
import {Interval} from './interval';
import {Vector3} from 'three';

export const JOINT_RADIUS = 0.15;
const AMBIENT_JOINT_MASS = 0.1;
const CABLE_MASS_FACTOR = 0.05;
const SPRING_SMOOTH = 0.03;
// const BAR_SMOOTH = 0.6;
// const CABLE_SMOOTH = 0.01;

export interface IPhysicsValue {
    name: string;
    value: number;
}

export interface IConstraints {
    elastic: () => number;
    exertJointPhysics: (joint: Joint, fabric: Fabric) => void;
}

export class Physics {

    private static splitArrows(arrow: Vector3, basis: Vector3, projection: Vector3, howMuch: number) {
        const agreement = arrow.dot(basis);
        projection.set(basis.x, basis.y, basis.z);
        projection.multiplyScalar(agreement * howMuch);
    }

    private gravity = new Vector3();
    private projection = new Vector3();
    private alphaProjection = new Vector3();
    private omegaProjection = new Vector3();

    constructor(public constraints: IConstraints) {
    }

    public iterate(fabric: Fabric) {
        fabric.intervals.forEach(interval => {
            this.elastic(interval);
        });
        fabric.intervals.forEach(interval => {
            this.smoothVelocity(interval, SPRING_SMOOTH);
        });
        fabric.joints.forEach(joint => {
            this.constraints.exertJointPhysics(joint, fabric);
            joint.velocity.addScaledVector(joint.force, 1.0 / joint.intervalMass);
            joint.force.set(0, 0, 0);
            joint.velocity.add(joint.absorbVelocity);
            joint.absorbVelocity.set(0, 0, 0);
        });
        fabric.intervals.forEach(interval => {
            const alphaAltitude = interval.alpha.altitude;
            const omegaAltitude = interval.omega.altitude;
            const straddle = (alphaAltitude > 0 && omegaAltitude <= 0) || (alphaAltitude <= 0 && omegaAltitude > 0);
            if (straddle) {
                const totalAltitude = Math.abs(alphaAltitude) + Math.abs(omegaAltitude);
                if (totalAltitude > 0.001) {
                    const g = interval.alpha.gravity;
                    this.gravity.set(g.x, g.y, g.z);
                    this.gravity.lerp(interval.omega.gravity, Math.abs(omegaAltitude) / totalAltitude);
                }
                else {
                    this.gravity.addVectors(interval.alpha.gravity, interval.omega.gravity).multiplyScalar(0.5);
                }
            }
            else {
                this.gravity.addVectors(interval.alpha.gravity, interval.omega.gravity).multiplyScalar(0.5);
            }
            interval.alpha.velocity.add(this.gravity);
            interval.omega.velocity.add(this.gravity);
        });
        fabric.joints.forEach(joint => {
            joint.location.add(joint.velocity);
            joint.intervalMass = AMBIENT_JOINT_MASS;
        });
    }

    private elastic(interval: Interval) {
        interval.calculate();
        interval.stress = this.constraints.elastic()* (interval.span - interval.idealSpan) * interval.idealSpan * interval.idealSpan;
        interval.alpha.force.addScaledVector(interval.unit, interval.stress / 2);
        interval.omega.force.addScaledVector(interval.unit, -interval.stress / 2);
        const canPush = true;
        const mass = canPush ? interval.idealSpan * interval.idealSpan * interval.idealSpan : interval.span * CABLE_MASS_FACTOR;
        interval.alpha.intervalMass += mass / 2;
        interval.omega.intervalMass += mass / 2;
    }

    private smoothVelocity(interval: Interval, degree: number) {
        Physics.splitArrows(interval.alpha.velocity, interval.unit, this.alphaProjection, degree);
        Physics.splitArrows(interval.omega.velocity, interval.unit, this.omegaProjection, degree);
        this.projection.addVectors(this.alphaProjection, this.omegaProjection).multiplyScalar(0.5);
        interval.alpha.absorbVelocity.sub(this.alphaProjection);
        interval.omega.absorbVelocity.sub(this.omegaProjection);
        interval.alpha.absorbVelocity.add(this.projection);
        interval.omega.absorbVelocity.add(this.projection);
    }

}