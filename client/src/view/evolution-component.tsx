import * as React from 'react';
import * as R3 from 'react-three';
import {Evolution} from '../gotchi/evolution';
import {FOREIGN_HANGER_MATERIAL, GOTCHI_GHOST_MATERIAL} from './materials';
import {Subscription} from 'rxjs/Subscription';
import {Evolver} from '../gotchi/evolver';

export interface IEvolutionProps {
    evolution: Evolution;
}

export interface IEvolutionState {
    evolvers: Evolver[];
}

export class EvolutionComponent extends React.Component<IEvolutionProps, IEvolutionState> {

    private subscription: Subscription;

    constructor(props: IEvolutionProps) {
        super(props);
        this.state = {
            evolvers: props.evolution.evolversNow.getValue()
        };
    }

    public componentDidMount() {
        this.subscription = this.props.evolution.evolversNow.subscribe(evolvers => {
            this.setState({evolvers});
        });
    }

    public componentWillUnmount() {
        this.subscription.unsubscribe();
    }

    public render() {
        return <R3.Object3D key="EvolutionMesh">
            {
                this.state.evolvers.map(evolver => {
                    const fabric = evolver.gotchi.fabric;
                    return (
                        <R3.Object3D key={`Evolver${evolver.id}`}>
                            <R3.LineSegments
                                geometry={fabric.compassGeometry}
                                material={FOREIGN_HANGER_MATERIAL}
                            />
                            <R3.Mesh
                                ref={(node: any) => evolver.gotchi.facesMeshNode = node}
                                geometry={fabric.facesGeometry}
                                material={GOTCHI_GHOST_MATERIAL}
                            />
                        </R3.Object3D>
                    );
                })
            }
        </R3.Object3D>;
    }
}