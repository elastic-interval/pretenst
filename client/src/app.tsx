import * as React from 'react';
import {CSSProperties} from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Island} from './island/island';
import {GotchiView} from './view/gotchi-view';
import {Fabric} from './body/fabric';
import {Gotchi, IGotchiFactory} from './gotchi/gotchi';
import {Genome} from './genetics/genome';
import {Vector3} from 'three';
import {Physics} from './body/physics';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    island: Island;
    width: number;
    height: number;
}

const updateDimensions = (): any => {
    return {width: window.innerWidth, height: window.innerHeight};
};

const margin = '20px';
const cornerRadius = '60px';

function insetStyle(top: boolean, right: boolean): CSSProperties {
    const css: CSSProperties = {
        position: 'absolute',
        color: 'white',
        backgroundColor: 'black',
        borderColor: 'white',
        borderStyle: 'solid',
        padding: '20px 20px 20px 20px',
        width: '200px',
        height: '200px'
    };
    if (top) {
        css.top = margin;
    } else {
        css.bottom = margin;
    }
    if (right) {
        css.right = margin;
        css.textAlign = 'right';
        if (top) {
            css.borderBottomLeftRadius = cornerRadius;
        } else {
            css.borderTopLeftRadius = cornerRadius;
        }
    } else {
        css.left = margin;
        if (top) {
            css.borderBottomRightRadius = cornerRadius;
        } else {
            css.borderTopRightRadius = cornerRadius;
        }
    }
    return css;
}

class App extends React.Component<IAppProps, IAppState> {
    private gotchiFactory: IGotchiFactory;
    private physics = new Physics();

    constructor(props: IAppProps) {
        super(props);
        this.gotchiFactory = {
            createGotchiAt: (location: Vector3, jointCountMax: number, genome: Genome): Promise<Gotchi> => {
                return this.props.createFabricInstance().then(fabricExports => {
                    this.physics.applyToFabric(fabricExports);
                    const fabric = new Fabric(fabricExports, jointCountMax);
                    fabric.createSeed(location.x, location.z);
                    return new Gotchi(fabric, genome);
                });
            }
        };
        this.state = {
            island: new Island('GalapagotchIsland', this.gotchiFactory),
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    public componentDidMount() {
        window.addEventListener("resize", () => this.setState(updateDimensions));
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", () => this.setState(updateDimensions));
    }

    public render() {
        return (
            <div>
                <GotchiView width={this.state.width} height={this.state.height} island={this.state.island}/>
                <div style={insetStyle(true, false)}>
                    <p>
                        top left
                    </p>
                    <p>
                        And here is a very long one consisting of multiple lines which should wrap i guess
                    </p>
                </div>
                <div style={insetStyle(true, true)}>
                    <p>
                        top right
                    </p>
                    <p>
                        And here is a very long one consisting of multiple lines which should wrap i guess
                    </p>
                </div>
                <div style={insetStyle(false, true)}>
                    <p>
                        bottom right
                    </p>
                    <p>
                        And here is a very long one consisting of multiple lines which should wrap i guess
                    </p>
                </div>
                <div style={insetStyle(false, false)}>
                    <p>
                        bottom left
                    </p>
                    <p>
                        And here is a very long one consisting of multiple lines which should wrap i guess
                    </p>
                </div>
            </div>
        );
    }

}

export default App;
