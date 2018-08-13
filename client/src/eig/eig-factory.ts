import {BILATERAL_LEFT, BILATERAL_MIDDLE, BILATERAL_RIGHT, EigFabric, ROLE_SPRING} from '../fabric';

export function createTetrahedron(fabric: EigFabric) {
    let jointTagCount = 0;
    const R = Math.sqrt(2) / 2;
    fabric.createJoint(BILATERAL_MIDDLE, jointTagCount++, R, -R, R);
    fabric.createJoint(BILATERAL_MIDDLE, jointTagCount++, -R, R, R);
    fabric.createJoint(BILATERAL_MIDDLE, jointTagCount++, -R, -R, -R);
    fabric.createJoint(BILATERAL_MIDDLE, jointTagCount++, R, R, -R);
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

export function createOctahedron(fabric: EigFabric) {
    let jointTagCount = 0;
    const R = Math.sqrt(2) / 2;
    for (let walk = 0; walk < 4; walk++) {
        const angle = walk * Math.PI / 2 + Math.PI / 4;
        fabric.createJoint(BILATERAL_MIDDLE, jointTagCount++, R * Math.cos(angle), 0, R + R * Math.sin(angle));
    }
    const left = fabric.createJoint(BILATERAL_LEFT, jointTagCount, 0, -R, R);
    const right = fabric.createJoint(BILATERAL_RIGHT, jointTagCount, 0, R, R);
    for (let walk = 0; walk < 4; walk++) {
        fabric.createInterval(ROLE_SPRING, walk, (walk + 1) % 4, -1);
        fabric.createInterval(ROLE_SPRING, walk, left, -1);
        fabric.createInterval(ROLE_SPRING, walk, right, -1);
    }
    for (let walk = 0; walk < 4; walk++) {
        fabric.createFace(left, walk, (walk + 1) % 4);
        fabric.createFace(right, (walk + 1) % 4, walk);
    }
}