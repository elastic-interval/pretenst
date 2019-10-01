/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Camera } from "react-three-fiber"
import { Intersection, Mesh, Raycaster, Vector2 } from "three"

export enum MeshKey {
    SPOTS_KEY = "Spots",
    SEEDS_KEY = "Seeds",
    TRIANGLES_KEY = "Triangles",
}

export class Selector {
    private meshes = new Map<MeshKey, Mesh>()
    private rayCaster = new Raycaster()
    private mouse = new Vector2()
    private size = new Vector2()

    constructor(private camera: Camera, width: number, height: number) {
        this.setSize(width, height)
    }

    public setMesh(key: MeshKey, mesh: Mesh): void {
        if (mesh) {
            this.meshes[key] = mesh
        } else {
            delete this.meshes[key]
        }
    }

    public setSize(width: number, height: number): void {
        this.size.x = width
        this.size.y = height
    }

    public select<T>(event: React.MouseEvent<HTMLDivElement>, meshKey: MeshKey, finder: (intersections: Intersection[]) => T | undefined): T | undefined {
        this.mouse.x = (event.clientX / this.size.x) * 2 - 1
        this.mouse.y = -(event.clientY / this.size.y) * 2 + 1
        this.rayCaster.setFromCamera(this.mouse, this.camera)
        const mesh = this.meshes[meshKey]
        const intersections = this.rayCaster.intersectObjects([mesh], true).filter(i => i.faceIndex !== undefined)
        return finder(intersections)
    }
}
