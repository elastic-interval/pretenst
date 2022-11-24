use cgmath::{InnerSpace, vec3, Vector3, VectorSpace};
use cgmath::num_traits::ToPrimitive;

#[derive(Debug, Clone)]
pub struct Vertex {
    pub index: usize,
    pub location: Vector3<f32>,
    pub adjacent: Vec<usize>,
}

struct VertexFactory {
    index: usize,
}

impl VertexFactory {
    fn gimme(&mut self, location: Vector3<f32>) -> Vertex {
        let index = self.index;
        Vertex { index, location, adjacent: vec![] }
    }
}

pub fn sphere_scaffold(frequency: usize, radius: f32) -> Vec<Vertex> {
    let mut factory = VertexFactory { index: 0 };
    let mut v: Vec<Vertex> = VERTEX.map(|vector|
        factory.gimme(vector.normalize() * radius)
    ).to_vec();
    match frequency {
        1 => {
            for [a, b] in EDGE {
                beside(&mut v, a, b);
            }
        }
        2 => {
            let mid_vertices = EDGE.map(|[a, b]|
                factory.gimme((v[a].location + v[b].location) / 2.0)
            );
            v.extend(mid_vertices);
            for [a, b] in EDGE {
                beside(&mut v, a, b);
            }
            for [a, b, c] in FACE_EDGES {
                beside(&mut v, a, b);
                beside(&mut v, b, c);
                beside(&mut v, c, a);
            }
        }
        _ => {
            let freq = frequency.to_f32().unwrap();
            let edge_v = EDGE.map(|[a, b]| {
                let mut vertices_here: Vec<Vertex> = vec![];
                let mut maybe_previous: Option<usize> = None;
                for walk_usize in 0..frequency - 1 {
                    let walk = walk_usize.to_f32().unwrap();
                    let amount = (walk + 1.0) / freq;
                    let index = v.len();
                    let location = v[a].location.lerp(v[b].location, amount);
                    vertices_here.push(factory.gimme(location));
                    if let Some(previous) = &maybe_previous {
                        beside(&mut v, *previous, index);
                        if walk_usize == frequency - 2 {
                            beside(&mut v, b, index);
                        }
                    } else {
                        beside(&mut v, a, index);
                        maybe_previous = Some(index);
                    }
                }
                v.extend(vertices_here.clone());
                vertices_here
            });
            let face_v = FACE_VERTICES.map(|[home, a, b]| {
                let origin = v[home].location;
                let mut vertices_here: Vec<Vertex> = vec![];
                // interpolate along the edges of the face creating arrays of vertices on the way
                for walk_a_usize in 1..frequency - 1 {
                    let walk_a = walk_a_usize.to_f32().unwrap();
                    let vector_a = origin.lerp(v[a].location, walk_a / freq) - origin;
                    for walk_b_usize in 1..frequency - walk_a_usize {
                        let walk_b = walk_b_usize.to_f32().unwrap();
                        let vector_b = origin.lerp(v[b].location, walk_b / freq) - origin;
                        let location = origin + vector_a + vector_b;
                        vertices_here.push(factory.gimme(location));
                    }
                }
                v.extend(vertices_here.clone());
                vertices_here
            });
            // define the adjacency among face vertices
            for row in 0..face_v.len() {
                for row_member in 0..face_v[row].len() {
                    if row_member < face_v[row].len() - 1 {
                        beside(&mut v, face_v[row][row_member].index, face_v[row][row_member + 1].index)
                    }
                    if row > 0 {
                        beside(&mut v, face_v[row][row_member].index, face_v[row - 1][row_member].index);
                        beside(&mut v, face_v[row][row_member].index, face_v[row - 1][row_member + 1].index);
                    }
                }
            }
            for array in PENTAGON_VERTICES {
                for current in 0..array.len() {
                    let next = (current + 1) % array.len();
                    let edge_vertex_a = if array[current].front { 0 } else { frequency - 2 };
                    let edge_vertex_b = if array[next].front { 0 } else { frequency - 2 };
                    beside(&mut v,
                           edge_v[array[current].edge][edge_vertex_a].index,
                           edge_v[array[next].edge][edge_vertex_b].index)
                }
            }
        }
    };
    // sort them
    v
}

fn beside(vertices: &mut [Vertex], index_a: usize, index_b: usize) {
    vertices[index_a].adjacent.push(index_b);
    vertices[index_b].adjacent.push(index_a);
}

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
