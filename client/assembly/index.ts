// The entry file of your WebAssembly module.

import {Fabric} from './eig/fabric';

const fabric = new Fabric();

export function add(a: i32, b: i32): i32 {
  return a + b;
}
