import {BILATERAL_LEFT, BILATERAL_RIGHT, EigFabric, ROLE_SPRING, UNILATERAL} from '../fabric';

export function createTetrahedron(fabric: EigFabric) {
    let jointTagCount = 0;
    const R = Math.sqrt(2) / 2;
    fabric.createJoint(UNILATERAL, jointTagCount++, R, -R, R);
    fabric.createJoint(UNILATERAL, jointTagCount++, -R, R, R);
    fabric.createJoint(UNILATERAL, jointTagCount++, -R, -R, -R);
    fabric.createJoint(UNILATERAL, jointTagCount++, R, R, -R);
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
        fabric.createJoint(UNILATERAL, jointTagCount++, R * Math.cos(angle), 0, R + R * Math.sin(angle));
    }
    const left = fabric.createJoint(BILATERAL_LEFT, jointTagCount, 0, -R, R);
    const right = fabric.createJoint(BILATERAL_RIGHT, jointTagCount, 0, R, R);
    for (let walk = 0; walk < 4; walk++) {
        fabric.createInterval(ROLE_SPRING, walk, (walk + 1) % 4, -1);
        fabric.createInterval(ROLE_SPRING, walk, left, -1);
        fabric.createInterval(ROLE_SPRING, walk, right, -1);
    }
    for (let walk = 0; walk < 4; walk++) {
        //     Face faceClock = new Face(Face.Order.LEFT_HANDED);
        //     Face faceAntiClock = new Face(Face.Order.RIGHT_HANDED);
        //     faceClock.joints.add(fabric.joints.get(4));
        //     faceAntiClock.joints.add(fabric.joints.get(5));
        //     faceClock.joints.add(fabric.joints.get(walk));
        //     faceAntiClock.joints.add(fabric.joints.get(walk));
        //     faceClock.joints.add(fabric.joints.get((walk + 1) % 4));
        //     faceAntiClock.joints.add(fabric.joints.get((walk + 1) % 4));
        //     fabric.faces.add(faceClock);
        //     fabric.faces.add(faceAntiClock);
        //     if (fabric.getThingFactory() != null) {
        //         faceClock.setThing(fabric.getThingFactory().createFresh(faceClock, "+" + walk));
        //         faceAntiClock.setThing(fabric.getThingFactory().createFresh(faceAntiClock, "-" + walk));
        //     }
    }
}