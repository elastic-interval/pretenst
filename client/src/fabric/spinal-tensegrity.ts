/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Vector3 } from "three"

import { IFabricInstanceExports, IntervalRole } from "./fabric-exports"
import { BILATERAL_MIDDLE } from "./gotchi-body"

enum IntervalSpan {
    RING_CABLE = 0.6,
    RING_SPRING = 1.3,
    COUNTER_CABLE = 0.4,
    HORIZONTAL_CABLE = 1.7,
    VERTICAL_CABLE = 1.7,
    BAR = 1.7,
}

type Joint = number
// type Interval = number
type JointTag = number

export class SpinalTensegrity {
    private geometryStored: BufferGeometry | undefined

    constructor(private exports: IFabricInstanceExports) {
        createVertebra(this, createRingLocations(3), true)
    }

    public recycle(): void {
        this.disposeOfGeometry()
        this.exports.recycle()
    }

    public get index(): number {
        return this.exports.index
    }

    public disposeOfGeometry(): void {
        if (this.geometryStored) {
            this.geometryStored.dispose()
            this.geometryStored = undefined
        }
    }

    public get vectors(): Float32Array {
        return this.exports.getVectors()
    }

    public get midpoint(): Vector3 {
        return this.exports.getMidpoint()
    }

    public get jointCount(): number {
        return this.exports.getJointCount()
    }

    public get intervalCount(): number {
        return this.exports.getIntervalCount()
    }

    public iterate(ticks: number): boolean {
        return this.exports.iterate(ticks)
    }

    public get age(): number {
        return this.exports.getAge()
    }

    public centralize(): void {
        this.exports.centralize()
    }

    public setAltitude(altitude: number): number {
        return this.exports.setAltitude(altitude)
    }

    public getJointLocation(joint: Joint): Vector3 {
        return this.exports.getJointLocation(joint)
    }

    public joint(jointTag: JointTag, location: Vector3): Joint {
        return this.exports.createJoint(jointTag, BILATERAL_MIDDLE, location.x, location.y, location.z)
    }

    public bar(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.BAR, false)
    }

    public growingBar(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.BAR, true)
    }

    public cable(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.CABLE, false)
    }

    public growingCable(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.CABLE, false)
    }
}

class Vertebra {
    public alpha: Ring
    public omega: Ring

    constructor(readonly rightHanded: boolean) {
    }

    public replace(vertebra: Vertebra, jointFrom: Joint, jointTo: Joint): void {
        this.alpha.replace(jointFrom, jointTo)
        this.omega.replace(jointFrom, jointTo)
    }

    public getEndJoints(alpha: boolean): Joint[] {
        const ring = alpha ? this.alpha : this.omega
        const joints = [...ring.joints]
        if (this.rightHanded) {
            const first = joints.shift()
            if (!first) {
                throw Error()
            }
            joints.push(first)
        } else {
            const last = joints.pop()
            if (!last) {
                throw new Error()
            }
            joints.unshift(last)
        }
        return joints
    }
}

function createVertebra(tensegrity: SpinalTensegrity, locations: Vector3[], rightHanded: boolean): Vertebra {
    const ringSize = locations.length
    const vertebra = new Vertebra(rightHanded)
    const otherLocations = createOtherRingLocations(locations, 0.3, true)
    const alpha = createRing(tensegrity, locations)
    const omega = createRing(tensegrity, otherLocations)
    for (let walk = 0; walk < ringSize; walk++) {
        tensegrity.cable(alpha.joints[walk], omega.joints[(walk + 1) % ringSize], IntervalSpan.COUNTER_CABLE)
        if (walk % 2 === 1) {
            tensegrity.bar(alpha.joints[walk], omega.joints[(walk + 2) % ringSize], IntervalSpan.BAR)
            tensegrity.cable(alpha.joints[walk], omega.joints[walk], IntervalSpan.VERTICAL_CABLE)
            // reposition
            // todo: locations adjusted too late
            // const midBar = new Vector3().addVectors(alphaLocations[walk], omegaLocations[(walk + 2) % ringSize]).multiplyScalar(0.5)
            // otherLocations[(walk + 1) % ringSize].add(midBar)
            // otherLocations[(walk + 1) % ringSize].multiplyScalar(0.5)
        }
    }
    for (let walk = 0; walk < ringSize; walk++) {
        const even = walk % 2 === 0
        if (even) {
            tensegrity.cable(omega.joints[walk], omega.joints[(walk + 2) % ringSize], IntervalSpan.RING_SPRING)
        } else {
            tensegrity.cable(omega.joints[walk], omega.joints[(walk + 2) % ringSize], IntervalSpan.HORIZONTAL_CABLE)
        }
        tensegrity.cable(omega.joints[walk], omega.joints[(walk + 1) % ringSize], IntervalSpan.RING_CABLE)
    }
    vertebra.alpha = alpha
    vertebra.omega = omega
    return vertebra
}

class Ring {
    public joints: Joint[] = []

    constructor(readonly tensegrity: SpinalTensegrity, private readonly forward: boolean) {
    }

    public get locations(): Vector3[] {
        return this.joints.map(joint => this.tensegrity.getJointLocation(joint))
    }

    public get midpoint(): Vector3 {
        return getMidpoint(this.locations)
    }

    public get normal(): Vector3 {
        return getNormal(this.midpoint, this.locations, this.forward)
    }

    public replace(jointFrom: Joint, jointTo: Joint): boolean {
        for (let walk = 0; walk < this.joints.length; walk++) {
            if (this.joints[walk] === jointFrom) {
                this.joints[walk] = jointTo
                return true
            }
        }
        return false
    }
}

function createRing(tensegrity: SpinalTensegrity, locations: Vector3[]): Ring {
    const ring = new Ring(tensegrity, true)
    const normal = getNormal(getMidpoint(locations), locations, true)
    locations.forEach((location, index) => {
        if (index % 2 === 1) {
            location.addScaledVector(normal, 0.03)
        }
    })
    ring.joints = locations.map((location, index) => {
        return tensegrity.joint(index, location)
    })
    const ringSize = locations.length
    for (let walk = 0; walk < ring.joints.length; walk++) {
        tensegrity.cable(ring.joints[walk], ring.joints[(walk + 1) % ringSize], IntervalSpan.RING_CABLE)
        if (walk % 2 === 1) {
            tensegrity.cable(ring.joints[walk], ring.joints[(walk + 2) % ringSize], IntervalSpan.HORIZONTAL_CABLE)
        } else {
            tensegrity.cable(ring.joints[walk], ring.joints[(walk + 2) % ringSize], IntervalSpan.RING_SPRING)
        }
    }
    return ring
}

function createRingLocations(ringSize: number): Vector3[] {
    const radius = ringSize / 6.0
    const locations: Vector3[] = []
    for (let walk = 0; walk < ringSize; walk++) {
        const angle = walk * 2 * Math.PI / ringSize
        locations.push(new Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0))
    }
    return locations
}

function createOtherRingLocations(existingLocations: Vector3[], displacement: number, forward: boolean): Vector3[] {
    const normal = getNormal(getMidpoint(existingLocations), existingLocations, forward)
    return [...existingLocations].map(location => location.addScaledVector(normal, displacement))
}

function getMidpoint(locations: Vector3[]): Vector3 {
    const accumulateLocation = (sum: Vector3, location: Vector3) => sum.add(location)
    return locations.reduce(accumulateLocation, new Vector3()).multiplyScalar(1 / locations.length)
}

function getNormal(midpoint: Vector3, locations: Vector3[], forward: boolean): Vector3 {
    const a = new Vector3()
    const b = new Vector3()
    const cross = new Vector3()
    const normal = new Vector3()
    for (let walk = 0; walk < locations.length; walk++) {
        a.subVectors(locations[walk], midpoint)
        b.subVectors(locations[(walk + 1) % locations.length], midpoint)
        if (forward) {
            cross.cross(b, a)
        } else {
            cross.cross(a, b)
        }
        const span = cross.length()
        if (span > 0.001) {
            cross.multiplyScalar(1 / span)
            normal.add(cross)
        }
    }
    const normalSpan = normal.length()
    if (normalSpan > 0.0001) {
        normal.multiplyScalar(1 / normalSpan)
    }
    return normal
}

/*

        if (joints == null) {
            createRing(fabric);
            createOtherJoints(fabric, 0.3);
        }
        else {
            removeSprings(joints, fabric);
            if (otherJoints != null) {
                removeSprings(otherJoints, fabric);
                connecting = true;
            }
            else {
                createOtherJoints(fabric, 0.1);
            }
        }
        List<Joint> alpha = rightHanded ? joints : otherJoints;
        List<Joint> omega = rightHanded ? otherJoints : joints;
        Arrow midBar = new Arrow();
        for (int walk = 0; walk < joints.size(); walk++) {
            Interval counterCable = fabric.createInterval(alpha.get(walk), omega.get((walk + 1) % joints.size()), Interval.Role.COUNTER_CABLE);
            setIdeal(counterCable);
            fabric.getMods().getIntervalMod().add(counterCable);
            if (walk % 2 == 1) {
                Interval bar = fabric.createInterval(alpha.get(walk), omega.get((walk + 2) % joints.size()), Interval.Role.BAR);
                setIdeal(bar);
                fabric.getMods().getIntervalMod().add(bar);
                Interval vertical = fabric.createInterval(alpha.get(walk), omega.get(walk), Interval.Role.VERTICAL_CABLE);
                setIdeal(vertical);
                fabric.getMods().getIntervalMod().add(vertical);
                // reposition
                bar.getLocation(midBar);
                otherJoints.get((walk + 1) % joints.size()).getLocation().add(midBar);
                otherJoints.get((walk + 1) % joints.size()).getLocation().scale(0.5);
            }
        }
        for (int walk = 0; walk < joints.size(); walk++) {
            boolean even = walk % 2 == 0;
            if (!connecting) {
                if (even) {
                    Interval spring = fabric.createInterval(otherJoints.get(walk), otherJoints.get((walk + 2) % joints.size()), Interval.Role.RING_SPRING);
                    setIdeal(spring);
                    fabric.getMods().getIntervalMod().add(spring);
                }
                else {
                    Interval safety = fabric.createInterval(otherJoints.get(walk), otherJoints.get((walk + 2) % joints.size()), Interval.Role.HORIZONTAL_CABLE);
                    setIdeal(safety);
                    fabric.getMods().getIntervalMod().add(safety);
                }
            }
            Interval ringCable = fabric.createInterval(otherJoints.get(walk), otherJoints.get((walk + 1) % joints.size()), Interval.Role.RING_CABLE);
            setIdeal(ringCable);
            fabric.getMods().getIntervalMod().add(ringCable);
        }
        vertebra = new Vertebra(!rightHanded);
        vertebra.getJoints().addAll(joints);
        vertebra.getJoints().addAll(otherJoints);
        fabric.getMods().getVertebraMod().add(vertebra);

    private static void removeSprings(List<Joint> jointList, Fabric fabric) {
        for (int walk = 0; walk < jointList.size(); walk++) {
            Interval spring = fabric.getInterval(jointList.get(walk), jointList.get((walk + 2) % jointList.size()));
            if (spring != null) {
                if (spring.getRole() != Interval.Role.RING_SPRING) {
                    continue;
                }
                fabric.getMods().getIntervalMod().remove(spring);
            }
        }
    }
 */

