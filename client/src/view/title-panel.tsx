import * as React from 'react';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {OrbitState} from './orbit';
import {Subscription} from 'rxjs/Subscription';

export interface ITitlePanelProps {
    version: string;
    islandName: string;
    orbitState: BehaviorSubject<OrbitState>;
}

export interface ITitlePanelState {
    orbitState: OrbitState;
}

export class TitlePanel extends React.Component<ITitlePanelProps, ITitlePanelState> {

    private orbitStateSubscription: Subscription;

    constructor(props: ITitlePanelProps) {
        super(props);
        this.state = {orbitState: props.orbitState.getValue()};
    }

    public componentDidMount() {
        this.orbitStateSubscription = this.props.orbitState.subscribe(orbitState => this.setState({orbitState}));
    }

    public componentWillUnmount() {
        this.orbitStateSubscription.unsubscribe();
    }

    public render() {
        return (
            <div>
                <h3>Welcome to Galapagotchi</h3>
                <strong>{this.props.islandName}</strong>
                <br/>
                <strong>version {this.props.version}</strong>
                <br/>
                <strong>{this.state.orbitState}</strong>
            </div>
        );
    }
}