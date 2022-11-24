use cgmath::{InnerSpace, vec3, Vector3};

#[derive(Debug)]
pub struct Vertex {
    pub index: usize,
    pub location: Vector3<f32>,
    pub adjacent: Vec<usize>,
}

pub fn sphere_scaffold<'a>(frequency: usize, radius: f32) -> Vec<Vertex> {
    let mut vertices: Vec<Vertex> = VERTEX
        .iter().enumerate()
        .map(|(index, vector)| Vertex {
            index,
            location: vector.normalize() * radius,
            adjacent: vec![],
        })
        .collect();
    match frequency {
        1 => for [a, b] in EDGE {
            vertices[a].adjacent.push(b);
            vertices[b].adjacent.push(a);
        },
        2 => {
            let mut mid_vertices = EDGE.map(|[a, b]| {
                let index = &vertices.len();
                let location = (vertices[a].location + vertices[b].location) / 2.0;
                let vertex = Vertex { index: *index, location, adjacent: vec![a, b] };
                vertices[a].adjacent.push(*index);
                vertices[b].adjacent.push(*index);
                vertex
            });
            for [a, b, c] in FACE_EDGES {
                mid_vertices[a].adjacent.push(b);
                mid_vertices[a].adjacent.push(c);
                mid_vertices[b].adjacent.push(a);
                mid_vertices[b].adjacent.push(c);
                mid_vertices[c].adjacent.push(a);
                mid_vertices[c].adjacent.push(b);
            }
            vertices.extend(mid_vertices.into_iter())
        }
        _ => {}
    }
    vertices
}
//
const NUL: f32 = 0.0;
const ONE: f32 = 0.525_731_1;
const PHI: f32 = 0.850_650_8;

const VERTEX: [Vector3<f32>; 12] = [
    vec3(ONE, NUL, PHI), vec3(ONE, NUL, -PHI),
    vec3(PHI, ONE, NUL), vec3(-PHI, ONE, NUL),
    vec3(NUL, PHI, ONE), vec3(NUL, -PHI, ONE),
    vec3(-ONE, NUL, -PHI), vec3(-ONE, NUL, PHI),
    vec3(-PHI, -ONE, NUL), vec3(PHI, -ONE, NUL),
    vec3(NUL, -PHI, -ONE), vec3(NUL, PHI, -ONE),
];

const EDGE: [[usize; 2]; 30] = [
    [0, 2], [0, 4], [0, 5], [0, 7], [0, 9],
    [1, 10], [1, 11], [1, 2], [1, 6], [1, 9],
    [2, 11], [2, 4], [2, 9], [3, 11], [3, 4],
    [3, 6], [3, 7], [3, 8], [4, 11], [4, 7],
    [5, 10], [5, 7], [5, 8], [5, 9], [6, 10],
    [6, 11], [6, 8], [7, 8], [8, 10], [9, 10],
];

const FACE_VERTICES: [[usize; 3]; 20] = [
    [0, 2, 4], [0, 2, 9], [0, 4, 7], [0, 5, 7], [0, 5, 9],
    [1, 2, 11], [1, 2, 9], [1, 6, 10], [1, 6, 11], [1, 9, 10],
    [2, 4, 11], [3, 4, 11], [3, 4, 7], [3, 6, 11], [3, 6, 8],
    [3, 7, 8], [5, 7, 8], [5, 8, 10], [5, 9, 10], [6, 8, 10],
];

const FACE_EDGES: [[usize; 3]; 20] = [
    [0, 11, 1], [0, 12, 4], [1, 19, 3], [2, 21, 3], [2, 23, 4],
    [7, 10, 6], [7, 12, 9], [8, 24, 5], [8, 25, 6], [9, 29, 5],
    [11, 18, 10], [14, 18, 13], [14, 19, 16], [15, 25, 13], [15, 26, 17],
    [16, 27, 17], [21, 27, 22], [22, 28, 20], [23, 29, 20], [26, 28, 24],
];

struct Penta {
    edge: usize,
    front: bool,
}

const PENTAGON_VERTICES: [[Penta; 5]; 12] = [
    [Penta { edge: 0, front: true }, Penta { edge: 1, front: true },
        Penta { edge: 3, front: true }, Penta { edge: 2, front: true }, Penta { edge: 4, front: true }],
    [Penta { edge: 7, front: true }, Penta { edge: 6, front: true },
        Penta { edge: 8, front: true }, Penta { edge: 5, front: true }, Penta { edge: 9, front: true }],
    [Penta { edge: 10, front: true }, Penta { edge: 11, front: true },
        Penta { edge: 0, front: false }, Penta { edge: 12, front: true }, Penta { edge: 7, front: false }],
    [Penta { edge: 14, front: true }, Penta { edge: 13, front: true },
        Penta { edge: 15, front: true }, Penta { edge: 17, front: true }, Penta { edge: 16, front: true }],
    [Penta { edge: 18, front: true }, Penta { edge: 11, front: false },
        Penta { edge: 1, front: false }, Penta { edge: 19, front: true }, Penta { edge: 14, front: false }],
    [Penta { edge: 21, front: true }, Penta { edge: 22, front: true },
        Penta { edge: 20, front: true }, Penta { edge: 23, front: true }, Penta { edge: 2, front: false }],
    [Penta { edge: 26, front: true }, Penta { edge: 24, front: true },
        Penta { edge: 8, front: false }, Penta { edge: 25, front: true }, Penta { edge: 15, front: false }],
    [Penta { edge: 27, front: true }, Penta { edge: 16, front: false },
        Penta { edge: 19, front: false }, Penta { edge: 3, front: false }, Penta { edge: 21, front: false }],
    [Penta { edge: 28, front: true }, Penta { edge: 22, front: false },
        Penta { edge: 27, front: false }, Penta { edge: 17, front: false }, Penta { edge: 26, front: false }],
    [Penta { edge: 4, front: false }, Penta { edge: 23, front: false },
        Penta { edge: 29, front: true }, Penta { edge: 9, front: false }, Penta { edge: 12, front: false }],
    [Penta { edge: 28, front: false }, Penta { edge: 20, front: false },
        Penta { edge: 29, front: false }, Penta { edge: 5, front: false }, Penta { edge: 24, front: false }],
    [Penta { edge: 6, front: false }, Penta { edge: 10, front: false },
        Penta { edge: 18, front: false }, Penta { edge: 13, front: false }, Penta { edge: 25, front: false }],
];
