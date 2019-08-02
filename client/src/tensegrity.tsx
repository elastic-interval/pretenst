/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { PerspectiveCamera } from "three"

import { IFabricExports } from "./fabric/fabric-exports"
import { createFabricKernel, FabricKernel } from "./fabric/fabric-kernel"
import { Physics } from "./fabric/physics"
import { TensegrityBrick, Triangle } from "./fabric/tensegrity-brick"
import { TensegrityFabric } from "./fabric/tensegrity-fabric"
import { MAX_POPULATION } from "./gotchi/evolution"
import { updateDimensions } from "./state/app-state"
import { INITIAL_DISTANCE } from "./view/flight"
import { TensegrityView } from "./view/tensegrity-view"

export interface ITensegrityProps {
    fabricExports: IFabricExports
}

export interface ITensegrityState {
    readonly tensegrityFabric: TensegrityFabric
    readonly width: number
    readonly height: number
    readonly left: number
    readonly top: number
}

export class Tensegrity extends React.Component<ITensegrityProps, ITensegrityState> {
    private perspectiveCamera: PerspectiveCamera
    private physics = new Physics()
    private fabricKernel: FabricKernel

    constructor(props: ITensegrityProps) {
        super(props)
        this.physics.applyToFabric(props.fabricExports)
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, 500)
        const tensegrityFabric = this.fabricKernel.createTensegrityFabric()
        if (!tensegrityFabric) {
            throw new Error()
        }
        if (tensegrityFabric) {
            const grow = (tb: TensegrityBrick, triangle: Triangle): TensegrityBrick => {
                const grown = tb.grow(triangle)
                console.log(`${Triangle[triangle]}:${triangle}`, grown.toString())
                return grown
            }
            const firstBrick = tensegrityFabric.createBrick()
            console.log("tensegrityBrick", tensegrityFabric.toString())
            // for (let triangle = Triangle.NNN; triangle <= Triangle.PPP; triangle++) {
            grow(firstBrick, Triangle.PPP)
            // }
        }
        const width = window.innerWidth
        const height = window.innerHeight
        this.perspectiveCamera = new PerspectiveCamera(50, width / height, 1, INITIAL_DISTANCE * 1.05)
        const left = window.screenLeft
        const top = window.screenTop
        this.state = {
            tensegrityFabric,
            width,
            height,
            left,
            top,
        }
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
    }

    public componentWillUnmount(): void {
        window.removeEventListener("resize", () => this.setState(updateDimensions))
    }

    public render(): JSX.Element {
        return (
            <div>
                <TensegrityView
                    perspectiveCamera={this.perspectiveCamera}
                    tensegrityState={this.state}
                />
            </div>
        )
    }

}
