import {BufferGeometry, Float32BufferAttribute, Geometry, Vector3} from 'three';
import {FabricKernel} from './fabric-kernel';
import {IFabricExports} from './fabric-exports';

export const BILATERAL_MIDDLE = 0;
export const BILATERAL_RIGHT = 1;
export const BILATERAL_LEFT = 2;

const vectorFromIndex = (array: Float32Array, index: number) => new Vector3(array[index], array[index + 1], array[index + 2]);

interface IFace {
    fabric: Fabric;
    index: number;
    laterality: number;
    midpoint: Vector3;
    normal: Vector3;
    jointIndex: number[];
    jointTag: string[];
    averageIdealSpan: number;
}

export class Fabric {
    private kernel: FabricKernel;

    constructor(private fab: IFabricExports, jointCountMax: number) {
        this.kernel = new FabricKernel(fab, jointCountMax, jointCountMax * 4, jointCountMax * 2);
    }

    public getFaceHighlightGeometries(faceIndex: number): Geometry[] {
        const createGeometry = (index: number) => {
            const geometry = new Geometry();
            const face = this.getFace(index);
            const apexHeight = face.averageIdealSpan * Math.sqrt(2 / 3);
            const apex = new Vector3().add(face.midpoint).addScaledVector(face.normal, apexHeight);
            const faceOffset = face.index * 3;
            const faceLocations = face.fabric.kernel.faceLocations;
            geometry.vertices = [
                vectorFromIndex(faceLocations, faceOffset * 3), apex,
                vectorFromIndex(faceLocations, (faceOffset + 1) * 3), apex,
                vectorFromIndex(faceLocations, (faceOffset + 2) * 3), apex
            ];
            return geometry;
        };
        const geometries: Geometry[] = [];
        geometries.push(createGeometry(faceIndex));
        const oppositeFaceIndex = this.fab.findOppositeFaceIndex(faceIndex);
        if (oppositeFaceIndex < this.fab.faces()) {
            geometries.push(createGeometry(oppositeFaceIndex));
        }
        return geometries;
    }

    public get facesGeometry(): BufferGeometry {
        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(this.kernel.faceLocations, 3));
        geometry.addAttribute('normal', new Float32BufferAttribute(this.kernel.faceNormals, 3));
        return geometry;
    }

    public get lineSegmentsGeometry(): BufferGeometry {
        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(this.kernel.lineLocations, 3));
        geometry.addAttribute('color', new Float32BufferAttribute(this.kernel.lineColors, 3));
        return geometry;
    }

    public createTetrahedron(): void {
        const R = Math.sqrt(2) / 2;
        this.fab.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R, -R, R);
        this.fab.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, -R, R, R);
        this.fab.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, -R, -R, -R);
        this.fab.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R, R, -R);
        this.createInterval(0, 1, -1);
        this.createInterval(1, 2, -1);
        this.createInterval(2, 3, -1);
        this.createInterval(2, 0, -1);
        this.createInterval(0, 3, -1);
        this.createInterval(3, 1, -1);
        this.createFace(0, 1, 2, 3);
        this.createFace(1, 3, 2, 0);
        this.createFace(1, 0, 3, 2);
        this.createFace(2, 3, 0, 1);
    }

    public createSeed(corners: number): void {
        const R = 1;
        for (let walk = 0; walk < corners; walk++) {
            const angle = walk * Math.PI * 2 / corners;
            this.fab.createJoint(this.fab.nextJointTag(), BILATERAL_MIDDLE, R * Math.sin(angle), R + R * Math.cos(angle), 0);
        }
        const jointPairName = this.fab.nextJointTag();
        const left = this.fab.createJoint(jointPairName, BILATERAL_LEFT, 0, R, -R);
        const right = this.fab.createJoint(jointPairName, BILATERAL_RIGHT, 0, R, R);
        for (let walk = 0; walk < corners; walk++) {
            this.createInterval(walk, (walk + 1) % corners, -1);
            this.createInterval(walk, left, -1);
            this.createInterval(walk, right, -1);
            this.createInterval(left, right, -1);
        }
        const nonexistentApex = this.kernel.jointCountMax;
        for (let walk = 0; walk < corners; walk++) {
            this.createFace(left, walk, (walk + 1) % corners, nonexistentApex);
            this.createFace(right, (walk + 1) % corners, walk, nonexistentApex);
        }
    }

    public iterate(ticks: number): void {
        this.fab.iterate(ticks);
    }

    public centralize(altitude: number): void {
        this.fab.centralize(altitude);
    }

    public createTetra(faceIndex: number): void {
        this.createTetraFromFace(this.getFace(faceIndex));
    }

    public toString(): string {
        return `${(this.kernel.blockBytes / 1024).toFixed(1)}k =becomes=> ${this.kernel.bufferBytes / 65536} block(s)`
    }

    // ==========================================================

    private createFace(joint0Index: number, joint1Index: number, joint2Index: number, apexJointIndex: number): number {
        return this.fab.createFace(joint0Index, joint1Index, joint2Index, apexJointIndex);
    }

    private removeFace(faceIndex: number): void {
        this.fab.removeFace(faceIndex);
    }

    private createInterval(alphaIndex: number, omegaIndex: number, span: number): number {
        return this.fab.createInterval(0, alphaIndex, omegaIndex, span);
    }

    private getFace(faceIndex: number): IFace {
        const getFaceLaterality = () => {
            for (let jointWalk = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
                const jointLaterality = this.fab.getJointLaterality(this.fab.getFaceJointIndex(faceIndex, jointWalk));
                if (jointLaterality !== BILATERAL_MIDDLE) {
                    return jointLaterality;
                }
            }
            return BILATERAL_MIDDLE;
        };
        const jointIndex = [0, 1, 2, 3]
            .map(jointNumber => this.fab.getFaceJointIndex(faceIndex, jointNumber));
        const normal = [0, 1, 2]
            .map(jointNumber => vectorFromIndex(this.kernel.faceNormals, (faceIndex * 3 + jointNumber) * 3))
            .reduce((prev, current) => prev.add(current), new Vector3()).multiplyScalar(1 / 3.0);
        return {
            fabric: this,
            index: faceIndex,
            laterality: getFaceLaterality(),
            midpoint: vectorFromIndex(this.kernel.faceMidpoints, faceIndex * 3),
            normal,
            jointIndex,
            jointTag: jointIndex.map(index => `${this.fab.getJointTag(index)}[${this.fab.getJointLaterality(index)}]`),
            averageIdealSpan: this.fab.getFaceAverageIdealSpan(faceIndex)
        };
    }

    private createTetraFromFace(face: IFace, knownApexTag?: number) {
        const midpoint = new Vector3(face.midpoint.x, face.midpoint.y, face.midpoint.z);
        const apexLocation = new Vector3(face.normal.x, face.normal.y, face.normal.z).multiplyScalar(face.averageIdealSpan * Math.sqrt(2 / 3)).add(midpoint);
        const apexTag = knownApexTag ? knownApexTag : this.fab.nextJointTag();
        const apex = this.fab.createJoint(apexTag, face.laterality, apexLocation.x, apexLocation.y, apexLocation.z);
        this.createInterval(face.jointIndex[0], apex, face.averageIdealSpan);
        this.createInterval(face.jointIndex[1], apex, face.averageIdealSpan);
        this.createInterval(face.jointIndex[2], apex, face.averageIdealSpan);
        const existingApexIndex = face.jointIndex[3];
        if (existingApexIndex < this.kernel.jointCountMax) {
            this.createInterval(existingApexIndex, apex, face.averageIdealSpan * 2 * Math.sqrt(2 / 3));
        }
        this.createFace(face.jointIndex[0], face.jointIndex[1], apex, face.jointIndex[2]);
        this.createFace(face.jointIndex[1], face.jointIndex[2], apex, face.jointIndex[0]);
        this.createFace(face.jointIndex[2], face.jointIndex[0], apex, face.jointIndex[1]);
        if (!knownApexTag) {
            const oppositeFaceIndex = this.fab.findOppositeFaceIndex(face.index);
            if (oppositeFaceIndex < this.kernel.faceCountMax) {
                const oppositeFace = this.getFace(oppositeFaceIndex);
                this.createTetraFromFace(oppositeFace, apexTag);
                if (oppositeFaceIndex < face.index) {
                    this.removeFace(oppositeFaceIndex);
                    this.removeFace(face.index - 1);
                } else {
                    this.removeFace(face.index);
                    this.removeFace(oppositeFaceIndex - 1);
                }
            } else {
                this.removeFace(face.index);
            }
        }
    }
}

