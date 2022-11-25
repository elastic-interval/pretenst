use cgmath::{InnerSpace, vec3, Vector3, VectorSpace};
use cgmath::num_traits::ToPrimitive;

#[derive(Debug, Clone)]
pub struct Vertex {
    pub index: usize,
    pub location: Vector3<f32>,
    pub adjacent: Vec<usize>,
}

pub struct SphereScaffold {
    frequency: usize,
    radius: f32,
    index: usize,
    pub vertex: Vec<Vertex>,
}

impl SphereScaffold {
    pub fn new(frequency: usize, radius: f32) -> SphereScaffold {
        SphereScaffold { frequency, radius, index: 0, vertex: vec![] }
    }

    pub fn generate(&mut self) {
        for vector in VERTEX {
            self.at(vector.normalize() * self.radius);
        }
        match self.frequency {
            1 => {
                for [a, b] in EDGE {
                    self.beside(a, b);
                }
            }
            2 => {
                let mid_verices = EDGE.map(|[a, b]| {
                    let mid = self.at((self.vertex[a].location + self.vertex[b].location) / 2.0);
                    self.beside(a, mid);
                    self.beside(mid, b);
                    mid
                });
                for [a, b, c] in FACE_EDGES {
                    self.beside(mid_verices[a], mid_verices[b]);
                    self.beside(mid_verices[b], mid_verices[c]);
                    self.beside(mid_verices[c], mid_verices[a]);
                }
            }
            _ => {
                let freq = self.frequency.to_f32().unwrap();
                let edge_v = EDGE.map(|[a, b]| {
                    let mut vertices: Vec<usize> = vec![];
                    let mut maybe_previous: Option<usize> = None;
                    for walk_usize in 0..self.frequency - 1 {
                        let walk = walk_usize.to_f32().unwrap();
                        let amount = (walk + 1.0) / freq;
                        let location = self.vertex[a].location.lerp(self.vertex[b].location, amount);
                        let vertex = self.at(location);
                        vertices.push(vertex);
                        if let Some(previous) = &maybe_previous {
                            self.beside(*previous, vertex);
                            if walk_usize == self.frequency - 2 {
                                self.beside(b, vertex);
                            }
                        } else {
                            self.beside(a, vertex);
                        }
                        maybe_previous = Some(vertex);
                    }
                    vertices
                });
                let face_vertices: [Vec<Vec<usize>>; 20] = FACE_VERTICES.map(|[home, a, b]| {
                    // interpolate along the edges of the face creating arrays of vertices on the way
                    let origin = self.vertex[home].location;
                    let mut va: Vec<Vec<usize>> = vec![];
                    for walk_a_usize in 0..self.frequency - 2 {
                        let walk_a = (walk_a_usize+1).to_f32().unwrap();
                        let amount_a = walk_a / freq;
                        let vector_a = origin.lerp(self.vertex[a].location, amount_a) - origin;
                        let mut vb: Vec<usize> = vec![];
                        for walk_b_usize in 1..self.frequency - walk_a_usize - 1 {
                            let walk_b = walk_b_usize.to_f32().unwrap();
                            let amount_b = walk_b / freq;
                            let vector_b = origin.lerp(self.vertex[b].location, amount_b) - origin;
                            let location = origin + vector_a + vector_b;
                            vb.push(self.at(location));
                        }
                        va.push(vb);
                    }
                    va
                });
                face_vertices.to_vec().into_iter().enumerate().for_each(|(face_index, face_v)| {
                    // define the adjacency among face vertices
                    for row in 0..face_v.len() {
                        for row_member in 0..face_v[row].len() {
                            if row_member < face_v[row].len() - 1 {
                                self.beside(face_v[row][row_member], face_v[row][row_member + 1])
                            }
                            if row > 0 {
                                self.beside(face_v[row][row_member], face_v[row - 1][row_member]);
                                self.beside(face_v[row][row_member], face_v[row - 1][row_member + 1]);
                            }
                        }
                    }
                    // compile side vertices (of a triangle!) reversing traversal when necessary
                    let mut side_vertices: [Vec<usize>; 3] = [vec![], vec![], vec![]];
                    for walk in 0..self.frequency - 2 {
                        let anti_walk = face_v.len() - walk - 1;
                        side_vertices[0].push(face_v[walk][0]);
                        side_vertices[1].push(face_v[anti_walk][face_v[anti_walk].len() - 1]);
                        side_vertices[2].push(face_v[0][walk]);
                    }
                    // define adjacency between face vertices and edge vertices
                    for walk_side in 0..side_vertices.len() {
                        let face_edges = FACE_EDGES[face_index];
                        let edge = &edge_v[face_edges[walk_side]];
                        for walk in 0..face_v.len() {
                            self.beside(side_vertices[walk_side][walk], edge[walk]);
                            self.beside(side_vertices[walk_side][walk], edge[walk + 1]);
                        }
                    }
                });
                for array in PENTAGON_VERTICES {
                    for curr in 0..array.len() {
                        let next = (curr + 1) % array.len();
                        let edge_vertex_a = if array[curr].front { 0 } else { self.frequency - 2 };
                        let edge_vertex_b = if array[next].front { 0 } else { self.frequency - 2 };
                        self.beside(edge_v[array[curr].edge][edge_vertex_a], edge_v[array[next].edge][edge_vertex_b])
                    }
                }
            }
        };
        let locations: Vec<Vector3<f32>> = self.vertex.iter().map(|Vertex { location, .. }| *location).collect();
        self.vertex.iter_mut().for_each(|vertex| sort_vertex(vertex, &locations));
    }

    fn at(&mut self, location: Vector3<f32>) -> usize {
        let index = self.index;
        self.index += 1;
        let vertex = Vertex { index, location, adjacent: vec![] };
        self.vertex.push(vertex);
        index
    }

    fn beside(&mut self, index_a: usize, index_b: usize) {
        self.vertex[index_a].adjacent.push(index_b);
        self.vertex[index_b].adjacent.push(index_a);
        if self.vertex[index_a].adjacent.len() > 6 {
            panic!("Overflow A {:?}: {:?}", index_a, self.vertex[index_a].adjacent.len())
        }
        if self.vertex[index_b].adjacent.len() > 6 {
            panic!("Overflow B {:?}: {:?}", index_b, self.vertex[index_b].adjacent.len())
        }
    }
}

fn sort_vertex(vertex: &mut Vertex, locations: &Vec<Vector3<f32>>) {
    let outward = vertex.location.normalize();
    let vector_to = |index: usize| (locations[index] - vertex.location).normalize();
    let count = vertex.adjacent.len();
    let mut unsorted = vertex.adjacent.clone();
    let first = unsorted.pop().unwrap();
    vertex.adjacent.clear();
    vertex.adjacent.push(first);
    for _walk in 0..count - 1 {
        if let Some(top) = vertex.adjacent.last() {
            let to_top = vector_to(*top);
            let next_position = unsorted.iter().position(|neighbor| {
                let to_adjacent = vector_to(*neighbor);
                let dot = to_adjacent.dot(to_top);
                if dot < 0.49 {
                    false
                } else {
                    to_top.cross(to_adjacent).dot(outward) > 0.0
                }
            });
            if let Some(next) = next_position {
                let next_index = unsorted[next];
                unsorted.remove(next);
                vertex.adjacent.push(next_index);
            } else {
                panic!("No next in {:?}", unsorted)
            }
        } else {
            panic!("Walking too far!");
        }
    }
    if vertex.adjacent.len() != count {
        panic!("Sort failed")
    }
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
