import {EigFabric, ROLE_SPRING, UNILATERAL} from '../fabric';

export function createTetrahedron(fabric: EigFabric) {
    let jointTagCount = 0;
    fabric.createJoint(UNILATERAL, jointTagCount++, 1, -1, 1);
    fabric.createJoint(UNILATERAL, jointTagCount++,-1, 1, 1);
    fabric.createJoint(UNILATERAL, jointTagCount++,-1, -1, -1);
    fabric.createJoint(UNILATERAL, jointTagCount++,1, 1, -1);
    fabric.createInterval(ROLE_SPRING, 0, 1, -1);
    fabric.createInterval(ROLE_SPRING, 1, 2, -1);
    fabric.createInterval(ROLE_SPRING, 2, 3, -1);
    fabric.createInterval(ROLE_SPRING, 2, 0, -1);
    fabric.createInterval(ROLE_SPRING, 0, 3, -1);
    fabric.createInterval(ROLE_SPRING, 3, 1, -1);
    fabric.createFace(0, 1, 2);
    fabric.createFace(1, 3, 2);
    fabric.createFace(1, 0, 3);
    fabric.createFace(2, 3, 0);
}