# Pretenst Design

Pretenst software is tool for designing four-dimensional physical structures made from elements of pure compression (bars) and tension (cables) and exploring how they behave over time and under stress.

## The Essence of Physical Structure

Pretenst structure, otherwise known as **tensegrity**, is minimalistic. It is structure distilled down to the basics of push and pull. It's because of this that these structures appear to be lighter than air, defying gravity, and that gives them their elegant beauty. The defining feature of tensegrity is that the pushing elements or bars are **floating**, separated from each other and only held together by a **network of tension**. The shape maintains its integrity because of the tension, and the compression pushing outwards is only localized.

## Development

You will need Rust, Node and Yarn installed.

The core of the app is the Elastic Interval Geometry math library which contains the tensegrity model, which is written in Rust.

The Rust code is compiled to WebAssembly and packaged as an NPM module called "eig" which is then loaded by the main project called "client".

To make the connection, the package must be yarn linked. This is done in the "scripts" within package.json.

For some reason, **only version 0.5.1 of wasm-pack** works, so try 

    wasm-pack --version

### Find out more and try it out on [pretenst.com](https://pretenst.com/).
