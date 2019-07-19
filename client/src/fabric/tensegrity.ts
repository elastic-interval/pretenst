/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

import { Direction, IFabricInstanceExports } from "./fabric-exports"

export class Tensegrity {
    private geometryStored: BufferGeometry | undefined

    constructor(private exports: IFabricInstanceExports) {
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

    public get seed(): Vector3 {
        return this.exports.getSeed()
    }

    public get forward(): Vector3 {
        return this.exports.getForward()
    }

    public get right(): Vector3 {
        return this.exports.getRight()
    }

    public get jointCount(): number {
        return this.exports.getJointCount()
    }

    public get intervalCount(): number {
        return this.exports.getIntervalCount()
    }

    public get faceCount(): number {
        return this.exports.getFaceCount()
    }

    public get facesGeometry(): BufferGeometry {
        const geometry = new BufferGeometry()
        geometry.addAttribute("position", new Float32BufferAttribute(this.exports.getFaceLocations(), 3))
        geometry.addAttribute("normal", new Float32BufferAttribute(this.exports.getFaceNormals(), 3))
        if (this.geometryStored) {
            this.geometryStored.dispose()
        }
        this.geometryStored = geometry
        return geometry
    }

    public get currentDirection(): Direction {
        return this.exports.getCurrentDirection()
    }

    public get nextDirection(): Direction {
        return this.exports.getNextDirection()
    }

    public set nextDirection(direction: Direction) {
        this.exports.setNextDirection(direction)
    }

    public iterate(ticks: number): boolean {
        return this.exports.iterate(ticks)
    }

    public endGestation(): void {
        this.exports.endGestation()
        this.exports.freshGeometry()
    }

    public get age(): number {
        return this.exports.getAge()
    }

    public get isGestating(): boolean {
        return this.exports.isGestating()
    }

    public centralize(): void {
        this.exports.centralize()
    }

    public setAltitude(altitude: number): number {
        return this.exports.setAltitude(altitude)
    }

    // ==========================================================

    // private bar(alphaIndex: number, omegaIndex: number, span: number): number {
    //     return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.BAR, false)
    // }
    //
    // private growingBar(alphaIndex: number, omegaIndex: number, span: number): number {
    //     return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.BAR, true)
    // }
    //
    // private cable(alphaIndex: number, omegaIndex: number, span: number): number {
    //     return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.CABLE, false)
    // }
    //
    // private growingCable(alphaIndex: number, omegaIndex: number, span: number): number {
    //     return this.exports.createInterval(alphaIndex, omegaIndex, span, IntervalRole.CABLE, false)
    // }
}

type Joint = number

export class Vertebra {
    public readonly joints: Joint[] = []

    constructor(readonly rightHanded: boolean) {
    }

    public replace(jointFrom: Joint, jointTo: Joint): void {
        const count = this.joints.length
        for (let walk = 0; walk < count; walk++) {
            if (this.joints[walk] === jointFrom) {
                this.joints[walk] = jointTo
            }
        }
    }

    public getEndJoints(alpha: boolean): Joint[] {
        const joints: Joint[] = []
        const offset = alpha ? 0 : this.joints.length / 2
        for (let walk = 0; walk < joints.length / 2; walk++) {
            joints.push(this.joints[walk + offset])
        }
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

    // todo: getLocation
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

   private void createOtherJoints(Fabric fabric, double displacement) {
        otherJoints = new ArrayList<Joint>();
        Ring ring = new Ring(joints, rightHanded);
        for (Joint joint : joints) {
            Joint newJoint = fabric.createJoint(fabric.who().createAnotherLike(joint.getWho()), joint.getLocation());
            newJoint.getLocation().add(ring.getNormal(), displacement);
            otherJoints.add(newJoint);
            fabric.getMods().getJointMod().add(newJoint);
        }
    }

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

    private List<Joint> createRing(Fabric fabric) {
        joints = new ArrayList<Joint>();
        double radius = ringSize / 6.0;
        for (int walk = 0; walk < ringSize; walk++) {
            double angle = walk * 2 * Math.PI / ringSize;
            Joint joint = fabric.createJoint(fabric.who().createMiddle(), new Arrow(radius * Math.cos(angle), radius * Math.sin(angle), 0));
            joints.add(joint);
            fabric.getMods().getJointMod().add(joint);
        }
        Ring ring = new Ring(joints, true);
        for (int walk = 0; walk < joints.size(); walk++) {
            boolean even = walk % 2 == 0;
            if (!even) {
                joints.get(walk).getLocation().add(ring.getNormal(), 0.03);
            }
            Interval ringCable = fabric.createInterval(joints.get(walk), joints.get((walk + 1) % ringSize), Interval.Role.RING_CABLE);
            setIdeal(ringCable);
            fabric.getMods().getIntervalMod().add(ringCable);
            if (even) {
                Interval spring = fabric.createInterval(joints.get(walk), joints.get((walk + 2) % ringSize), Interval.Role.RING_SPRING);
                setIdeal(spring);
                fabric.getMods().getIntervalMod().add(spring);
            }
            else {
                Interval safety = fabric.createInterval(joints.get(walk), joints.get((walk + 2) % ringSize), Interval.Role.HORIZONTAL_CABLE);
                setIdeal(safety);
                fabric.getMods().getIntervalMod().add(safety);
            }
        }
        return joints;
    }


 */
