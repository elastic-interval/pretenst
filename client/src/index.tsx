import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';
import registerServiceWorker from './service-worker';
import {IEigWasm} from './eig-wasm';

declare const eigWasmPromise: Promise<IEigWasm>;

eigWasmPromise.then((eigWasm: IEigWasm) => {
    console.log('buffer', eigWasm.memory.buffer);
    const arr = new Float64Array(eigWasm.memory.buffer);
    const first50 = arr.subarray(0, 50);
    console.log('first 50', first50);
    console.log('WASM memory bytes',  eigWasm.memory.buffer.byteLength);
    ReactDOM.render(
        <App eigWasm={eigWasm}/>,
        document.getElementById('root') as HTMLElement
    );
    registerServiceWorker();
});


