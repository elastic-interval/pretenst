/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Mesh, PerspectiveCamera, Raycaster, Vector2 } from "three"

import { Island } from "../island/island"
import { Spot } from "../island/spot"

export enum MeshKey {
    SPOTS_KEY = "Spots",
    SEEDS_KEY = "Seeds",
}

export class SpotSelector {
    private meshes = new Map<MeshKey, Mesh>()
    private rayCaster = new Raycaster()
    private mouse = new Vector2()
    private size = new Vector2()

    constructor(private camera: PerspectiveCamera, width: number, height: number) {
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

    public getSpot(island: Island, meshKey: MeshKey, event: React.MouseEvent<HTMLDivElement>): Spot | undefined {
        this.adjustRaycaster(event)
        return this.findSpot(island, meshKey)
    }

    // ==================

    private adjustRaycaster(event: React.MouseEvent<HTMLDivElement>): void {
        // todo: const rect = event.target.getBoundingClientRect();
        // this.mouse.x = ((event.clientX - rect.left) / this.size.x) * 2 - 1;
        // this.mouse.y = -((event.clientY - rect.top) / this.size.y) * 2 + 1;
        this.mouse.x = (event.clientX / this.size.x) * 2 - 1
        this.mouse.y = -(event.clientY / this.size.y) * 2 + 1
        this.rayCaster.setFromCamera(this.mouse, this.camera)
    }

    private findSpot(island: Island, meshKey: MeshKey): Spot | undefined {
        const mesh = this.meshes[meshKey]
        const intersections = this.rayCaster.intersectObjects([mesh], true)
            .filter(i => i.faceIndex !== undefined)
        const spots = intersections.map(intersection => {
            const faceName = `${meshKey}:${intersection.faceIndex}`
            return island.spots.find(spot => spot.faceNames.indexOf(faceName) >= 0)
        })
        return spots.pop()
    }
}
