import {Joint} from './joint';
import {Fabric} from './fabric';
import {IConstraints, IPhysicsValue, JOINT_RADIUS} from './physics';

export class VerticalConstraints implements IConstraints {

    private static exertGravity(joint: Joint, value: number) {
        joint.velocity.y -= value;
    }

    public airDrag: IPhysicsValue = {name: "airDrag", value: 0.00005};
    public airGravity: IPhysicsValue = {name: "airGravity", value: 0.0001};
    public landDrag: IPhysicsValue = {name: "landDrag", value: 20};
    public landGravity: IPhysicsValue = {name: "landGravity", value: 30};
    public elasticFactor: IPhysicsValue = {name: "elasticFactor", value: 0.07};

    public exertJointPhysics(joint: Joint, fabric: Fabric) {
        const altitude = joint.location.y;
        if (altitude > JOINT_RADIUS) {
            VerticalConstraints.exertGravity(joint, this.airGravity.value);
            joint.velocity.multiplyScalar(1 - this.airDrag.value);
        }
        else if (altitude < -JOINT_RADIUS) {
            VerticalConstraints.exertGravity(joint, -this.airGravity.value * this.landGravity.value);
            joint.velocity.multiplyScalar(1 - this.airDrag.value * this.landDrag.value);
        }
        else {
            const degree = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2);
            const gravityValue = this.airGravity.value * degree + -this.airGravity.value * this.landGravity.value * (1 - degree);
            VerticalConstraints.exertGravity(joint, gravityValue);
            const drag = this.airDrag.value * degree + this.airDrag.value * this.landDrag.value * (1 - degree);
            joint.velocity.multiplyScalar(1 - drag);
        }
    }

    public elastic = () => {
        return this.elasticFactor.value;
    };
}