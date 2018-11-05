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
                {
                    this.props.master ?
                        <strong>{this.props.master}</strong>
                        : <span>no master yet</span>
                }
            </div>
        );
    }
}