import * as React from 'react';

export interface ITitlePanelProps {
    version: string;
    islandName: string;
}

export class TitlePanel extends React.Component<ITitlePanelProps, any> {

    constructor(props: ITitlePanelProps) {
        super(props);
    }

    public render() {
        return (
            <div>
                <h3>Welcome to Galapagotchi</h3>
                <strong>{this.props.islandName}</strong>
                <br/>
                <strong>version {this.props.version}</strong>
            </div>
        );
    }
}