/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Canvas } from "react-three-fiber"
import { Subscription } from "rxjs/Subscription"

import { Evolution } from "../gotchi/evolution"
import { Jockey } from "../gotchi/jockey"

import { GOTCHI_ARROW, GOTCHI_GHOST } from "./materials"

export interface IEvolutionProps {
    evolution: Evolution
}

export interface IEvolutionState {
    evolvers: Jockey[]
}

export class EvolutionComponent extends React.Component<IEvolutionProps, IEvolutionState> {

    private subscription: Subscription

    constructor(props: IEvolutionProps) {
        super(props)
        this.state = {
            evolvers: props.evolution.currentJockeys.getValue(),
        }
    }

    public componentDidMount(): void {
        this.subscription = this.props.evolution.currentJockeys.subscribe(evolvers => {
            this.setState({evolvers})
        })
    }

    public componentWillUnmount(): void {
        this.subscription.unsubscribe()
    }

    public render(): JSX.Element {
        return (
            <Canvas key="EvolutionMesh">
                {
                    this.state.evolvers.map((evolver, index) => {
                        const fabric = evolver.fabric
                        return (
                            <group key={`Evolver${index}`}>
                                <lineSegments key="Vectors"
                                              geometry={fabric.pointerGeometryFor(evolver.nextState)}
                                              material={GOTCHI_ARROW}
                                />
                                <mesh
                                    geometry={fabric.facesGeometry}
                                    material={GOTCHI_GHOST}
                                />
                            </group>
                        )
                    })
                }
            </Canvas>
        )
    }
}
