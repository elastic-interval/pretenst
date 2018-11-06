import * as React from 'react';

export interface IIdentityPanelProps {
    master?: string;
}

export class IdentityPanel extends React.Component<IIdentityPanelProps, any> {

    constructor(props: IIdentityPanelProps) {
        super(props);
    }

    public render() {
        return (
            <div>
                <h3>Identity</h3>
                {this.content}
            </div>
        );
    }

    private get content() {
        if (this.props.master) {
            return (
                <strong>{this.props.master}</strong>
            );
        } else {
            return (
                <p>
                    You do not yet have a home gotch. You can choose one of the green spots.
                </p>
            );
        }
    }
}