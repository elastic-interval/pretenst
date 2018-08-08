import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';
import registerServiceWorker from './service-worker';
import {IFabric} from './fabric';

declare const fabricFactory: () => Promise<IFabric>;

ReactDOM.render(
    <App fabricFactory={fabricFactory}/>,
    document.getElementById('root') as HTMLElement
);
registerServiceWorker();

// eigWasmPromise.then((fabric: IFabric) => {
//     const arr = new Float64Array(fabric.memory.buffer);
//     const first50 = arr.subarray(0, 50);
//     console.log('first 50', first50);
//     console.log('WASM memory bytes',  fabric.memory.buffer.byteLength);
// });


