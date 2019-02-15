import * as React from 'react';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {OrbitDistance} from './orbit';
import {Subscription} from 'rxjs/Subscription';
import {Spot} from '../island/spot';

export interface ITitlePanelProps {
    version: string;
    islandName: string;
    orbitState: BehaviorSubject<OrbitDistance>;
    selectedSpot: BehaviorSubject<Spot | undefined>;
}

export interface ITitlePanelState {
    orbitState: OrbitDistance;
    selectedSpot?: Spot;
}

export class TitlePanel extends React.Component<ITitlePanelProps, ITitlePanelState> {

    private subs: Subscription[] = [];

    constructor(props: ITitlePanelProps) {
        super(props);
        this.state = {orbitState: props.orbitState.getValue()};
    }

    public componentDidMount() {
        this.subs.push(this.props.orbitState.subscribe(orbitState => this.setState({orbitState})));
        this.subs.push(this.props.selectedSpot.subscribe(selectedSpot => this.setState({selectedSpot})));
    }

    public componentWillUnmount() {
        this.subs.forEach(s => s.unsubscribe());
    }

    public render() {
        const spot = this.state.selectedSpot;
        return (
            <div>
                <h3>Welcome to Galapagotchi</h3>
                <strong>{this.props.islandName}</strong>
                <br/>
                <strong>version {this.props.version}</strong>
                <br/>
                <strong>{this.state.orbitState}</strong>
                <br/>
                <strong>{spot ? `Spot(${spot.coords.x},${spot.coords.y})` : null}</strong>
            </div>
        );
    }
}