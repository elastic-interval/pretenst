extern crate vec3;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn gumby() -> [i32; 3] {
    let a = [1, 1, 1];
    let b = [1, 1, 1];
    let mut out = vec3::new(0, 0, 0);

    vec3::add(&mut out, &a, &b);
    out
}

#[cfg(test)]
#[test]
fn it_works() {
    let pokey = vec3::new(2, 2, 2);
    assert_eq!(gumby(), pokey);
}

