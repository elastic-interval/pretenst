/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import * as R3 from "react-three"
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
        return <R3.Object3D key="EvolutionMesh">
            {
                this.state.evolvers.map((evolver, index) => {
                    const fabric = evolver.fabric
                    return (
                        <R3.Object3D key={`Evolver${index}`}>
                            <R3.LineSegments key="Vectors"
                                             geometry={fabric.pointerGeometryFor(evolver.nextDirection)}
                                             material={GOTCHI_ARROW}
                            />
                            <R3.Mesh
                                geometry={fabric.facesGeometry}
                                material={GOTCHI_GHOST}
                            />
                        </R3.Object3D>
                    )
                })
            }
        </R3.Object3D>
    }
}
