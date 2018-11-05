import * as React from 'react';

export interface IActionsPanelProps {
    startEvolution: () => void;
    rebirth: () => void;
}

export class ActionsPanel extends React.Component<IActionsPanelProps, any> {

    constructor(props: IActionsPanelProps) {
        super(props);
        // window.addEventListener("keypress", (event: KeyboardEvent) => {
        //     switch (event.code) {
        //         case 'KeyG':
        //             this.birthFromGotch(this.state.masterGotch);
        //             break;
        //         case 'KeyE':
        //         case 'KeyY':
        //             if (masterGotch && tripSpots.length > 0) {
        //                 const randomize = event.code === 'KeyY';
        //                 if (randomize && masterGotch && masterGotch.genome) {
        //                     masterGotch.genome = freshGenomeFor(masterGotch.genome.master);
        //                 }
        //                 this.setState(startEvolution(masterGotch, this.state.trip))
        //             }
        //             break;
        //         case 'KeyL':
        //             if (this.state.gotchi) {
        //                 console.log('genome', this.state.gotchi.genomeData);
        //             }
        //     }
        // });
        // window.addEventListener("keydown", (event: KeyboardEvent) => {
        //     const setDirection = (direction: Direction) => {
        //         const gotchi = this.state.gotchi;
        //         if (gotchi) {
        //             gotchi.direction = direction;
        //         }
        //     };
        //     switch (event.code) {
        //         case 'ArrowUp':
        //             setDirection(Direction.FORWARD);
        //             break;
        //         case 'ArrowRight':
        //             setDirection(Direction.RIGHT);
        //             break;
        //         case 'ArrowLeft':
        //             setDirection(Direction.LEFT);
        //             break;
        //         case 'ArrowDown':
        //             setDirection(Direction.REVERSE);
        //             break;
        //     }
        // });
    }

    public render() {
        return (
            <div>
                <h3>Actions</h3>
                <button onClick={() => this.props.startEvolution()}>Start evolution</button>
                <br/>
                <button onClick={() => this.props.rebirth()}>Rebirth</button>
            </div>
        );
    }




}