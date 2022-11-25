/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

export interface IVertex {
    index: number,
    location: Vector3
    adjacent: IVertex[]
}

export class SphereScaffold {
    public readonly vertices: IVertex[] = []

    constructor(public readonly frequency: number, public readonly radius: number) {
        VERTEX.forEach(location => this.vertexAt(location))
        if (frequency === 1) {
            EDGE.forEach(edge => {
                const v0 = this.vertices[edge[0]]
                const v1 = this.vertices[edge[1]]
                adjacent(v0, v1)
            })
        } else if (frequency === 2) {
            const midVertices = EDGE.map(edge => {
                const v0 = this.vertices[edge[0]]
                const v1 = this.vertices[edge[1]]
                const midEdge = this.vertexBetween(v0, v1)
                adjacent(v0, midEdge)
                adjacent(midEdge, v1)
                return midEdge
            })
            FACE_EDGES.forEach(faceEdge => {
                const side0 = midVertices[faceEdge[0]]
                const side1 = midVertices[faceEdge[1]]
                const side2 = midVertices[faceEdge[2]]
                adjacent(side0, side1)
                adjacent(side1, side2)
                adjacent(side2, side0)
            })
        } else {
            this.buildFaces(this.buildEdgeVertices())
        }
        this.vertices.forEach(sortVertex)
    }

    private buildEdgeVertices(): IVertex[][] {
        const edgeVertices: IVertex[][] = []
        EDGE.forEach(edgeVertexIndex => {
            const verticesOfEdge: IVertex[] = []
            edgeVertices.push(verticesOfEdge)
            let vertex: IVertex | undefined
            let previousVertex: IVertex | undefined
            for (let walk = 0; walk < this.frequency - 1; walk++) {
                previousVertex = vertex
                const v0 = this.vertices[edgeVertexIndex[0]]
                const v1 = this.vertices[edgeVertexIndex[1]]
                const loc0 = v0.location
                const loc1 = v1.location
                const spot = new Vector3().lerpVectors(loc0, loc1, (walk + 1) / this.frequency)
                vertex = this.vertexAt(spot)
                verticesOfEdge.push(vertex)
                if (previousVertex) {
                    adjacent(vertex, previousVertex)
                    if (walk === this.frequency - 2) {
                        adjacent(vertex, v1)
                    }
                } else {
                    adjacent(vertex, v0)
                }
            }
        })
        return edgeVertices
    }

    private buildFaces(edgeVertices: IVertex[][]): void {
        FACE_VERTICES.forEach((faceVertexIndex, faceIndex) => {
            const faceVertexArrays: IVertex[][] = []
            const faceVertex = (which: number) => this.vertices[faceVertexIndex[which]]
            const v0 = faceVertex(0)
            const origin = v0.location
            // interpolate along the edges of the face creating arrays of vertices on the way
            for (let walkA = 0; walkA < this.frequency - 2; walkA++) {
                const v1 = faceVertex(1)
                const vectorA = new Vector3().lerpVectors(origin, v1.location, walkA / this.frequency)
                vectorA.sub(origin)
                faceVertexArrays[walkA] = []
                for (let walkB = 1; walkB < this.frequency - walkA - 1; walkB++) {
                    const v2 = faceVertex(2)
                    const vectorB = new Vector3().lerpVectors(origin, v2.location, walkB / this.frequency)
                    vectorB.sub(origin)
                    const spot = new Vector3().copy(origin)
                    spot.add(vectorA)
                    spot.add(vectorB)
                    faceVertexArrays[walkA].push(this.vertexAt(spot))
                }
            }
            // define the adjacency among face vertices
            for (let row = 0; row < faceVertexArrays.length; row++) {
                for (let rowMember = 0; rowMember < faceVertexArrays[row].length; rowMember++) {
                    if (rowMember < faceVertexArrays[row].length - 1) {
                        adjacent(faceVertexArrays[row][rowMember], faceVertexArrays[row][rowMember + 1])
                    }
                    if (row > 0) {
                        const vert = faceVertexArrays[row][rowMember]
                        adjacent(vert, faceVertexArrays[row - 1][rowMember])
                        adjacent(vert, faceVertexArrays[row - 1][rowMember + 1])
                    }
                }
            }
            // compile side vertices (of a triangle!) reversing traversal when necessary
            const sideVertices: IVertex[] [] = [[], [], []]
            for (let walk = 0; walk < this.frequency - 2; walk++) {
                const antiWalk = faceVertexArrays.length - walk - 1
                sideVertices[0].push(faceVertexArrays[walk][0])
                sideVertices[1].push(faceVertexArrays[antiWalk][faceVertexArrays[antiWalk].length - 1])
                sideVertices[2].push(faceVertexArrays[0][walk])
            }
            // define adjacency between face vertices and edge vertices
            for (let walkSide = 0; walkSide < sideVertices.length; walkSide++) {
                const faceEdges = FACE_EDGES[faceIndex]
                const edge = edgeVertices[faceEdges[walkSide]]
                for (let walk = 0; walk < faceVertexArrays.length; walk++) {
                    adjacent(sideVertices[walkSide][walk], edge[walk])
                    adjacent(sideVertices[walkSide][walk], edge[walk + 1])
                }
            }
        })
        PENTAGON_VERTICES.forEach(vertexArray => {
            // define the adjacency for this pentagon
            for (let current = 0; current < vertexArray.length; current++) {
                const next = (current + 1) % vertexArray.length
                const edgeVertexA = vertexArray[current].front ? 0 : this.frequency - 2
                const edgeVertexB = vertexArray[next].front ? 0 : this.frequency - 2
                const vertexA = edgeVertices[vertexArray[current].edge][edgeVertexA]
                const vertexB = edgeVertices[vertexArray[next].edge][edgeVertexB]
                adjacent(vertexA, vertexB)
            }
        })
    }

    private vertexBetween(v0: IVertex, v1: IVertex): IVertex {
        const location = new Vector3().copy(v0.location).lerp(v1.location, 0.5)
        return this.vertexAt(location)
    }

    private vertexAt(location: Vector3): IVertex {
        const length = location.length()
        location.multiplyScalar(this.radius / length)
        const index = this.vertices.length
        const vertex = {index, location, adjacent: []}
        this.vertices.push(vertex)
        return vertex
    }
}

const NUL = 0.0
const ONE = 0.5257311121191336
const PHI = 0.8506508083520400

const VERTEX: Vector3[] = [
    new Vector3(+ONE, NUL, +PHI), new Vector3(+ONE, NUL, -PHI),
    new Vector3(+PHI, +ONE, NUL), new Vector3(-PHI, +ONE, NUL),
    new Vector3(NUL, +PHI, +ONE), new Vector3(NUL, -PHI, +ONE),
    new Vector3(-ONE, NUL, -PHI), new Vector3(-ONE, NUL, +PHI),
    new Vector3(-PHI, -ONE, NUL), new Vector3(+PHI, -ONE, NUL),
    new Vector3(NUL, -PHI, -ONE), new Vector3(NUL, +PHI, -ONE),
]

const EDGE = [
    [0, 2], [0, 4], [0, 5], [0, 7], [0, 9],
    [1, 10], [1, 11], [1, 2], [1, 6], [1, 9],
    [2, 11], [2, 4], [2, 9], [3, 11], [3, 4],
    [3, 6], [3, 7], [3, 8], [4, 11], [4, 7],
    [5, 10], [5, 7], [5, 8], [5, 9], [6, 10],
    [6, 11], [6, 8], [7, 8], [8, 10], [9, 10],
]

const FACE_VERTICES = [
    [0, 2, 4], [0, 2, 9], [0, 4, 7], [0, 5, 7], [0, 5, 9],
    [1, 2, 11], [1, 2, 9], [1, 6, 10], [1, 6, 11], [1, 9, 10],
    [2, 4, 11], [3, 4, 11], [3, 4, 7], [3, 6, 11], [3, 6, 8],
    [3, 7, 8], [5, 7, 8], [5, 8, 10], [5, 9, 10], [6, 8, 10],
]

const FACE_EDGES = [
    [0, 11, 1], [0, 12, 4], [1, 19, 3], [2, 21, 3], [2, 23, 4],
    [7, 10, 6], [7, 12, 9], [8, 24, 5], [8, 25, 6], [9, 29, 5],
    [11, 18, 10], [14, 18, 13], [14, 19, 16], [15, 25, 13], [15, 26, 17],
    [16, 27, 17], [21, 27, 22], [22, 28, 20], [23, 29, 20], [26, 28, 24],
]

interface IPentagonVertex {
    edge: number
    front: boolean
}

const PENTAGON_VERTICES: IPentagonVertex[][] = [
    [{edge: 0, front: true}, {edge: 1, front: true},
        {edge: 3, front: true}, {edge: 2, front: true}, {edge: 4, front: true}],
    [{edge: 7, front: true}, {edge: 6, front: true},
        {edge: 8, front: true}, {edge: 5, front: true}, {edge: 9, front: true}],
    [{edge: 10, front: true}, {edge: 11, front: true},
        {edge: 0, front: false}, {edge: 12, front: true}, {edge: 7, front: false}],
    [{edge: 14, front: true}, {edge: 13, front: true},
        {edge: 15, front: true}, {edge: 17, front: true}, {edge: 16, front: true}],
    [{edge: 18, front: true}, {edge: 11, front: false},
        {edge: 1, front: false}, {edge: 19, front: true}, {edge: 14, front: false}],
    [{edge: 21, front: true}, {edge: 22, front: true},
        {edge: 20, front: true}, {edge: 23, front: true}, {edge: 2, front: false}],
    [{edge: 26, front: true}, {edge: 24, front: true},
        {edge: 8, front: false}, {edge: 25, front: true}, {edge: 15, front: false}],
    [{edge: 27, front: true}, {edge: 16, front: false},
        {edge: 19, front: false}, {edge: 3, front: false}, {edge: 21, front: false}],
    [{edge: 28, front: true}, {edge: 22, front: false},
        {edge: 27, front: false}, {edge: 17, front: false}, {edge: 26, front: false}],
    [{edge: 4, front: false}, {edge: 23, front: false},
        {edge: 29, front: true}, {edge: 9, front: false}, {edge: 12, front: false}],
    [{edge: 28, front: false}, {edge: 20, front: false},
        {edge: 29, front: false}, {edge: 5, front: false}, {edge: 24, front: false}],
    [{edge: 6, front: false}, {edge: 10, front: false},
        {edge: 18, front: false}, {edge: 13, front: false}, {edge: 25, front: false}],
]

function adjacent(v0: IVertex, v1: IVertex): void {
    v0.adjacent.push(v1)
    v1.adjacent.push(v0)
}

// sort the adjacent vertices of a vertex in a clockwise way
function sortVertex(vertex: IVertex): void {
    const outward = new Vector3().copy(vertex.location).normalize()
    const first = vertex.adjacent.pop()
    if (!first) {
        throw new Error("No first to pop!")
    }
    const sorted: IVertex[] = [first]
    const vectorTo = ({location}: IVertex) => new Vector3().subVectors(location, vertex.location).normalize()
    while (vertex.adjacent.length > 0) {
        const top: IVertex = sorted[sorted.length - 1]
        const next = vertex.adjacent.find(neigbor => {
            const toAdjacent = vectorTo(neigbor)
            const toTop = vectorTo(top)
            if (toAdjacent.dot(toTop) < 0.25) {
                return false
            }
            return new Vector3().crossVectors(toTop, toAdjacent).dot(outward) > 0
        })
        if (!next) {
            throw new Error("No next found")
        }
        sorted.push(next)
        vertex.adjacent = vertex.adjacent.filter(adj => adj.index !== next.index)
    }
    vertex.adjacent = sorted
}
