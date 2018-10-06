import * as React from 'react';
import * as R3 from 'react-three';
import {Evolution} from '../gotchi/evolution';
import {Gotchi} from '../gotchi/gotchi';
import {GOTCHI_GHOST_MATERIAL} from './materials';
import {Subscription} from 'rxjs/Subscription';

export interface IEvolutionProps {
    evolution: Evolution;
}

export interface IEvolutionState {
    gotchis: Gotchi[];
}

export class EvolutionComponent extends React.Component<IEvolutionProps, IEvolutionState> {

    private subscription: Subscription;

    constructor(props: IEvolutionProps) {
        super(props);
        this.state = {
            gotchis: props.evolution.visibleGotchis.getValue()
        };
    }

    public componentDidMount() {
        this.subscription = this.props.evolution.visibleGotchis.subscribe(gotchis => {
            this.setState(() => {
                return {gotchis};
            });
        });
    }

    public componentWillUnmount() {
        this.subscription.unsubscribe();
    }

    public render() {
        return <R3.Object3D key="EvolutionMesh">{
            this.state.gotchis.map((gotchi: Gotchi, index: number) => {
                return <R3.Mesh
                    ref={(node: any) => gotchi.facesMeshNode = node}
                    key={`GotchiGhost${index}`}
                    geometry={gotchi.fabric.facesGeometry}
                    material={GOTCHI_GHOST_MATERIAL}
                />
            })
        }</R3.Object3D>;
    }
}