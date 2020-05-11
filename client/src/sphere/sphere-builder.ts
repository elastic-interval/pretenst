/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { IInterval, IJoint, IPercent, percentOrHundred, percentToFactor } from "../fabric/tensegrity-types"

import { TensegritySphere } from "./tensegrity-sphere"

export interface ISphere {
    frequency: number
    radius: number
    twist: number
}

interface IVertex {
    joint: IJoint
    interval: IInterval[]
    adjacent: IVertex[]
}

function scaleToInitialStiffness(scale: IPercent): number {
    const scaleFactor = percentToFactor(scale)
    return Math.pow(scaleFactor, 0.6) * 0.00001
}

export class SphereBuilder {
    private vertices: IVertex[] = []
    private frequency = 1
    private edgeVertexCount = 0
    private radius = 1

    constructor(private sphere: TensegritySphere) {
    }

    public withDimensions(frequency: number, radius: number): SphereBuilder {
        this.frequency = frequency
        this.edgeVertexCount = this.frequency - 1
        this.radius = radius
        return this
    }

    public build(altitude: number): TensegritySphere {
        VERTEX.forEach(loc => this.vertexAt(new Vector3(loc[0], loc[1], loc[2])))
        this.sphere.instance.refreshFloatView()
        switch (this.edgeVertexCount) {
            case 0:
                this.build30Edges()
                break
            case 1:
                const sixty = this.build60Edges()
                this.buildSmallFaces(sixty)
                break
            default:
                const many = this.buildEdges()
                this.buildFaces(many)
                break
        }
        this.sphere.fabric.set_altitude(altitude)
        return this.sphere
    }

    private vertexAt(location: Vector3): IVertex {
        location.normalize().multiplyScalar(this.radius)
        const index = this.sphere.createJoint(location)
        const joint: IJoint = {
            index,
            oppositeIndex: -1,
            location: () => this.sphere.instance.jointLocation(index),
        }
        this.sphere.joints.push(joint) // TODO: have the thing create a real joint?
        const vertex: IVertex = {joint, adjacent: [], interval: []}
        this.vertices.push(vertex)
        return vertex
    }

    private intervalBetween(vertexA: IVertex, vertexB: IVertex): IInterval {
        const scale = percentOrHundred()
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        const countdown = 1000
        const interval = this.sphere.createInterval(vertexA.joint, vertexB.joint, IntervalRole.NexusPush, scale, stiffness, linearDensity, countdown)
        vertexA.adjacent.push(vertexB)
        vertexA.interval.push(interval)
        vertexB.adjacent.push(vertexA)
        vertexB.interval.push(interval)
        return interval
    }

    private connect(vertexA: IVertex, vertexB: IVertex, withMiddle?: boolean): { vertexA: IVertex, vertexB: IVertex, vertexMid?: IVertex } {
        if (withMiddle) {
            const middleLocation = new Vector3().copy(vertexA.joint.location()).lerp(vertexB.joint.location(), 0.5)
            const vertexMid = this.vertexAt(middleLocation)
            this.intervalBetween(vertexA, vertexMid)
            this.intervalBetween(vertexMid, vertexB)
            return {vertexA, vertexB, vertexMid}
        } else {
            this.intervalBetween(vertexA, vertexB)
            return {vertexA, vertexB}
        }
    }

    private build60Edges(): IVertex[] {
        const edgeVertexes: IVertex[] = []
        EDGE.forEach(edge => {
            const {vertexMid} = this.connect(this.vertices[edge[0]], this.vertices[edge[1]], true)
            if (vertexMid) {
                edgeVertexes.push(vertexMid)
            }
        })
        return edgeVertexes
    }

    private build30Edges(): void {
        EDGE.forEach(edge => this.connect(this.vertices[edge[0]], this.vertices[edge[1]]))
    }

    private buildEdges(): IVertex[][] {
        const edgeVertices: IVertex[][] = []
        EDGE.forEach(edge => {
            const edgeVertexRows: IVertex[] = []
            edgeVertices.push(edgeVertexRows)
            let vertex: IVertex | undefined
            let previousVertex: IVertex | undefined
            for (let walkBeads = 0; walkBeads < this.edgeVertexCount; walkBeads++) {
                previousVertex = vertex
                const v0 = this.vertices[edge[0]]
                const v1 = this.vertices[edge[1]]
                const loc0 = v0.joint.location()
                const loc1 = v1.joint.location()
                const spot = new Vector3().lerpVectors(loc0, loc1, (walkBeads + 1) / this.frequency)
                vertex = this.vertexAt(spot)
                edgeVertexRows.push(vertex)
                if (previousVertex) {
                    console.log("prev", vertex, previousVertex, v1)
                    this.connect(vertex, previousVertex)
                    if (walkBeads === this.edgeVertexCount - 1) {
                        this.connect(vertex, v1)
                    }
                } else {
                    console.log("no prev", vertex, v0)
                    this.connect(vertex, v0)
                }
            }
        })
        PENTA.forEach(penta => {
            for (let walk = 0; walk < penta.length; walk++) {
                const next = (walk + 1) % penta.length
                const walkBead = penta[walk][1] === 1 ? 0 : this.edgeVertexCount - 1
                const nextBead = penta[next][1] === 1 ? 0 : this.edgeVertexCount - 1
                const currentVertex = edgeVertices[penta[walk][0]][walkBead]
                const nextVertex = edgeVertices[penta[next][0]][nextBead]
                this.connect(currentVertex, nextVertex)
            }
        })
        return edgeVertices
    }

    private buildSmallFaces(vertices: IVertex[]): void {
        FACE_EDGE.forEach(faceEdge => {
            const side0 = vertices[Math.abs(faceEdge[0])]
            const side1 = vertices[Math.abs(faceEdge[1])]
            const side2 = vertices[Math.abs(faceEdge[2])]
            this.connect(side0, side1)
            this.connect(side1, side2)
            this.connect(side2, side0)
        })
    }

    private buildFaces(vertices: IVertex[][]): void {
        const v: IVertex[][] = []
        for (let walk = 0; walk < this.edgeVertexCount - 1; walk++) {
            v.push([])
        }
        const vectorA = new Vector3()
        const vectorB = new Vector3()
        for (let walkF = 0; walkF < FACE.length; walkF++) {
            const v0 = this.vertices[FACE[walkF][0]]
            const origin = v0.joint.location()
            for (let walkA = 1; walkA < this.edgeVertexCount; walkA++) {
                const v1 = this.vertices[FACE[walkF][1]]
                vectorA.lerpVectors(origin, v1.joint.location(), walkA / this.frequency)
                vectorA.sub(origin)
                v[walkA - 1] = []
                for (let walkB = 1; walkB < this.edgeVertexCount - walkA + 1; walkB++) {
                    const v2 = this.vertices[FACE[walkF][2]]
                    vectorB.lerpVectors(origin, v2.joint.location(), walkB / this.frequency)
                    vectorB.sub(origin)
                    const spot = new Vector3().copy(origin)
                    spot.add(vectorA)
                    spot.add(vectorB)
                    v[walkA - 1].push(this.vertexAt(spot))
                }
            }
            for (let walkRow = 0; walkRow < v.length; walkRow++) {
                for (let walk = 0; walk < v[walkRow].length; walk++) {
                    if (walk < v[walkRow].length - 1) {
                        this.connect(v[walkRow][walk], v[walkRow][walk + 1])
                    }
                    if (walkRow > 0) {
                        const vert = v[walkRow][walk]
                        this.connect(vert, v[walkRow - 1][walk])
                        this.connect(vert, v[walkRow - 1][walk + 1])
                    }
                }
            }
            const vv0: IVertex[] = []
            const vv1: IVertex[] = []
            const vv2: IVertex[] = []
            for (let walk = 0; walk < this.edgeVertexCount - 1; walk++) {
                const antiWalk = v.length - walk - 1
                vv0.push(v[FACE_EDGE[walkF][0] >= 0 ? walk : antiWalk][0])
                const ee = v[(FACE_EDGE[walkF][1] < 0) ? walk : antiWalk]
                vv1.push(ee[ee.length - 1])
                vv2.push(v[0][(FACE_EDGE[walkF][2] < 0) ? walk : antiWalk])
            }
            const vs: IVertex[] [] = []
            vs.push(vv0)
            vs.push(vv1)
            vs.push(vv2)
            for (let walkSide = 0; walkSide < vs.length; walkSide++) {
                const edge = vertices[Math.abs(FACE_EDGE[walkF][walkSide])]
                for (let walk = 0; walk < v.length; walk++) {
                    const vsVertex = vs[walkSide][walk]
                    this.connect(vsVertex, edge[walk])
                    this.connect(vsVertex, edge[walk + 1])
                }
            }
        }
    }
}

const NUL = 0.0
const ONE = 0.5257311121191336
const PHI = 0.8506508083520400

const VERTEX = [
    [+ONE, NUL, +PHI], [+ONE, NUL, -PHI],
    [+PHI, +ONE, NUL], [-PHI, +ONE, NUL],
    [NUL, +PHI, +ONE], [NUL, -PHI, +ONE],
    [-ONE, NUL, -PHI], [-ONE, NUL, +PHI],
    [-PHI, -ONE, NUL], [+PHI, -ONE, NUL],
    [NUL, -PHI, -ONE], [NUL, +PHI, -ONE],
]

const EDGE = [
    [0, 2], [0, 4], [0, 5], [0, 7], [0, 9],
    [1, 10], [1, 11], [1, 2], [1, 6], [1, 9],
    [2, 11], [2, 4], [2, 9], [3, 11], [3, 4],
    [3, 6], [3, 7], [3, 8], [4, 11], [4, 7],
    [5, 10], [5, 7], [5, 8], [5, 9], [6, 10],
    [6, 11], [6, 8], [7, 8], [8, 10], [9, 10],
]

const FACE = [
    [0, 2, 4], [0, 2, 9], [0, 4, 7], [0, 5, 7], [0, 5, 9],
    [1, 2, 11], [1, 2, 9], [1, 6, 10], [1, 6, 11], [1, 9, 10],
    [2, 4, 11], [3, 4, 11], [3, 4, 7], [3, 6, 11], [3, 6, 8],
    [3, 7, 8], [5, 7, 8], [5, 8, 10], [5, 9, 10], [6, 8, 10],
]

const FACE_EDGE = [
    [0, 11, -1], [0, 12, -4], [1, 19, -3], [2, 21, -3], [2, 23, -4],
    [7, 10, -6], [7, 12, -9], [8, 24, -5], [8, 25, -6], [9, 29, -5],
    [11, 18, -10], [14, 18, -13], [14, 19, -16], [15, 25, -13], [15, 26, -17],
    [16, 27, -17], [21, 27, -22], [22, 28, -20], [23, 29, -20], [26, 28, -24],
]

const PENTA = [
    [[0, 1], [1, 1], [3, 1], [2, 1], [4, 1]],
    [[7, 1], [6, 1], [8, 1], [5, 1], [9, 1]],
    [[10, 1], [11, 1], [0, -1], [12, 1], [7, -1]],
    [[14, 1], [13, 1], [15, 1], [17, 1], [16, 1]],
    [[18, 1], [11, -1], [1, -1], [19, 1], [14, -1]],
    [[21, 1], [22, 1], [20, 1], [23, 1], [2, -1]],
    [[26, 1], [24, 1], [8, -1], [25, 1], [15, -1]],
    [[27, 1], [16, -1], [19, -1], [3, -1], [21, -1]],
    [[28, 1], [22, -1], [27, -1], [17, -1], [26, -1]],
    [[4, -1], [23, -1], [29, 1], [9, -1], [12, -1]],
    [[28, -1], [20, -1], [29, -1], [5, -1], [24, -1]],
    [[6, -1], [10, -1], [18, -1], [13, -1], [25, -1]],
]

export function sphereNumeric(feature: WorldFeature, defaultValue: number): number {
    switch (feature) {
        case WorldFeature.NexusPushLength:
            return 0.1
        case WorldFeature.IterationsPerFrame:
            return defaultValue * 3
        case WorldFeature.IntervalCountdown:
            return defaultValue
        case WorldFeature.Gravity:
            return defaultValue
        case WorldFeature.Drag:
            return defaultValue * 0.1
        case WorldFeature.ShapingStiffnessFactor:
            return defaultValue * 5
        case WorldFeature.PushRadius:
            return defaultValue * 3
        case WorldFeature.PullRadius:
            return defaultValue * 2
        case WorldFeature.JointRadiusFactor:
            return defaultValue * 0.8
        case WorldFeature.PretensingCountdown:
            return defaultValue * 4
        case WorldFeature.VisualStrain:
            return defaultValue
        case WorldFeature.SlackThreshold:
            return 0
        case WorldFeature.MaxStrain:
            return defaultValue * 0.1
        case WorldFeature.PretenstFactor:
            return defaultValue * 0.5
        case WorldFeature.StiffnessFactor:
            return defaultValue * 300.0
        case WorldFeature.PushOverPull:
            return 4
        default:
            return defaultValue
    }
}
