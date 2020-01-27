use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub enum SurfaceCharacter {
    Frozen,
    Sticky,
    Slippery,
    Bouncy,
}

#[wasm_bindgen]
pub fn init() -> usize {
    10101
}

#[wasm_bindgen]
pub fn set_surface_character(character: SurfaceCharacter) -> ()  {
    unsafe {
        SURFACE_CHARACTER = character
    }
}

#[wasm_bindgen]
pub fn set_push_and_pull(value: bool) -> () {
    unsafe {
        PUSH_AND_PULL = value
    }
}

#[wasm_bindgen]
pub fn set_coloring(pushes: bool, pulls: bool) -> () {
    unsafe {
        COLOR_PUSHES = pushes;
        COLOR_PULLS = pulls;
    }
}

#[wasm_bindgen]
pub fn set_instance(index: u16) -> () {
    unsafe {
        INSTANCE_NUMBER = index;
    }
}

#[wasm_bindgen]
pub fn clone_instance(_from_index: u16, _index: u16) -> () {
}

#[wasm_bindgen]
pub fn get_instance_count() -> u16 {
    1
}

static mut SURFACE_CHARACTER: SurfaceCharacter = SurfaceCharacter::Frozen;
static mut PUSH_AND_PULL: bool = true;
static mut COLOR_PUSHES: bool = true;
static mut COLOR_PULLS: bool = true;
static mut INSTANCE_NUMBER: u16 = 0;

#[cfg(test)]
#[test]
fn it_works() {
    assert_eq!(init(), 10101);
}

