extern crate vec3;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn gumby() -> f32 {
    let a: [f32; 3] = [1.0, 1.0, 1.0];
    let b: [f32; 3] = [1.0, 1.0, 1.0];
    let mut out: [f32; 3] = vec3::new(0.0, 0.0, 0.0);

    vec3::add(&mut out, &a, &b);
    vec3::len(&out)
}

#[cfg(test)]
#[test]
fn it_works() {
    let pokey: [f32; 3] = vec3::new(2.0, 2.0, 2.0);
    assert_eq!(gumby(), vec3::len(&pokey));
}

