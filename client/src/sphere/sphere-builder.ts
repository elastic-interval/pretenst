/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import { Vector3 } from "three"

import { IHub, TensegritySphere } from "./tensegrity-sphere"

export class SphereBuilder {
    constructor(private sphere: TensegritySphere) {
    }

    public build(): TensegritySphere {
        VERTEX.forEach(loc => this.sphere.hubAt(new Vector3(loc[0], loc[1], loc[2])))
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
        const push = this.sphere.hubs[0].spokes[0].push
        const segmentLength = push.alpha.location().distanceTo(push.omega.location()) * 0.28
        console.log("segment", segmentLength.toFixed(5))
        this.sphere.hubs.forEach(hub => hub.spokes.forEach(spoke => this.sphere.pullsForSpoke(hub, spoke, segmentLength)))
        this.sphere.fabric.set_altitude(this.sphere.location.y)
        return this.sphere
    }

    private push(hubA: IHub, hubB: IHub, withMiddle?: boolean): { hubA: IHub, hubB: IHub, hubMid?: IHub } {
        if (withMiddle) {
            const middleLocation = new Vector3().copy(hubA.location).lerp(hubB.location, 0.5)
            const hubMid = this.sphere.hubAt(middleLocation)
            this.sphere.pushBetween(hubA, hubMid)
            this.sphere.pushBetween(hubMid, hubB)
            return {hubA, hubB, hubMid}
        } else {
            this.sphere.pushBetween(hubA, hubB)
            return {hubA, hubB}
        }
    }

    private build60Edges(): IHub[] {
        const edgeHubs: IHub[] = []
        EDGE.forEach(edge => {
            const {hubMid} = this.push(this.vertices[edge[0]], this.vertices[edge[1]], true)
            if (hubMid) {
                edgeHubs.push(hubMid)
            }
        })
        return edgeHubs
    }

    private build30Edges(): void {
        EDGE.forEach(edge => this.push(this.vertices[edge[0]], this.vertices[edge[1]]))
    }

    private buildEdges(): IHub[][] {
        const edgePoints: IHub[][] = []
        EDGE.forEach(edge => {
            const edgeVertexRows: IHub[] = []
            edgePoints.push(edgeVertexRows)
            let vertex: IHub | undefined
            let previousVertex: IHub | undefined
            for (let walkBeads = 0; walkBeads < this.edgeVertexCount; walkBeads++) {
                previousVertex = vertex
                const v0 = this.vertices[edge[0]]
                const v1 = this.vertices[edge[1]]
                const loc0 = v0.location
                const loc1 = v1.location
                const spot = new Vector3().lerpVectors(loc0, loc1, (walkBeads + 1) / this.sphere.frequency)
                vertex = this.sphere.hubAt(spot)
                edgeVertexRows.push(vertex)
                if (previousVertex) {
                    this.push(vertex, previousVertex)
                    if (walkBeads === this.edgeVertexCount - 1) {
                        this.push(vertex, v1)
                    }
                } else {
                    this.push(vertex, v0)
                }
            }
        })
        PENTA.forEach(penta => {
            for (let walk = 0; walk < penta.length; walk++) {
                const next = (walk + 1) % penta.length
                const walkBead = penta[walk][1] === 1 ? 0 : this.edgeVertexCount - 1
                const nextBead = penta[next][1] === 1 ? 0 : this.edgeVertexCount - 1
                const currentVertex = edgePoints[penta[walk][0]][walkBead]
                const nextVertex = edgePoints[penta[next][0]][nextBead]
                this.push(currentVertex, nextVertex)
            }
        })
        return edgePoints
    }

    private buildSmallFaces(vertices: IHub[]): void {
        FACE_EDGE.forEach(faceEdge => {
            const side0 = vertices[Math.abs(faceEdge[0])]
            const side1 = vertices[Math.abs(faceEdge[1])]
            const side2 = vertices[Math.abs(faceEdge[2])]
            this.push(side0, side1)
            this.push(side1, side2)
            this.push(side2, side0)
        })
    }

    private buildFaces(vertices: IHub[][]): void {
        const v: IHub[][] = []
        for (let walk = 0; walk < this.edgeVertexCount - 1; walk++) {
            v.push([])
        }
        const vectorA = new Vector3()
        const vectorB = new Vector3()
        for (let walkF = 0; walkF < FACE.length; walkF++) {
            const v0 = this.vertices[FACE[walkF][0]]
            const origin = v0.location
            for (let walkA = 1; walkA < this.edgeVertexCount; walkA++) {
                const v1 = this.vertices[FACE[walkF][1]]
                vectorA.lerpVectors(origin, v1.location, walkA / this.sphere.frequency)
                vectorA.sub(origin)
                v[walkA - 1] = []
                for (let walkB = 1; walkB < this.edgeVertexCount - walkA + 1; walkB++) {
                    const v2 = this.vertices[FACE[walkF][2]]
                    vectorB.lerpVectors(origin, v2.location, walkB / this.sphere.frequency)
                    vectorB.sub(origin)
                    const spot = new Vector3().copy(origin)
                    spot.add(vectorA)
                    spot.add(vectorB)
                    v[walkA - 1].push(this.sphere.hubAt(spot))
                }
            }
            for (let walkRow = 0; walkRow < v.length; walkRow++) {
                for (let walk = 0; walk < v[walkRow].length; walk++) {
                    if (walk < v[walkRow].length - 1) {
                        this.push(v[walkRow][walk], v[walkRow][walk + 1])
                    }
                    if (walkRow > 0) {
                        const vert = v[walkRow][walk]
                        this.push(vert, v[walkRow - 1][walk])
                        this.push(vert, v[walkRow - 1][walk + 1])
                    }
                }
            }
            const vv0: IHub[] = []
            const vv1: IHub[] = []
            const vv2: IHub[] = []
            for (let walk = 0; walk < this.edgeVertexCount - 1; walk++) {
                const antiWalk = v.length - walk - 1
                vv0.push(v[FACE_EDGE[walkF][0] >= 0 ? walk : antiWalk][0])
                const ee = v[(FACE_EDGE[walkF][1] < 0) ? walk : antiWalk]
                vv1.push(ee[ee.length - 1])
                vv2.push(v[0][(FACE_EDGE[walkF][2] < 0) ? walk : antiWalk])
            }
            const vs: IHub[] [] = []
            vs.push(vv0)
            vs.push(vv1)
            vs.push(vv2)
            for (let walkSide = 0; walkSide < vs.length; walkSide++) {
                const edge = vertices[Math.abs(FACE_EDGE[walkF][walkSide])]
                for (let walk = 0; walk < v.length; walk++) {
                    const vsVertex = vs[walkSide][walk]
                    this.push(vsVertex, edge[walk])
                    this.push(vsVertex, edge[walk + 1])
                }
            }
        }
    }

    private get vertices(): IHub[] {
        return this.sphere.hubs
    }

    private get edgeVertexCount(): number {
        return this.sphere.frequency - 1
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
        case WorldFeature.IterationsPerFrame:
            return defaultValue
        case WorldFeature.Drag:
            return defaultValue
        case WorldFeature.Gravity:
            return 0
        case WorldFeature.PretenstFactor:
            return defaultValue
        case WorldFeature.StiffnessFactor:
            return defaultValue * 10
        default:
            return defaultValue
    }
}
