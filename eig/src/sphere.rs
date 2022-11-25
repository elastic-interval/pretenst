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
    index: usize,
    pub vertex: Vec<Vertex>,
}

impl SphereScaffold {
    pub fn new(frequency: usize) -> SphereScaffold {
        SphereScaffold { frequency, index: 0, vertex: vec![] }
    }

    pub fn generate(&mut self) {
        for vector in VERTEX {
            self.at(vector);
        }
        match self.frequency {
            1 => {
                for [a, b] in EDGE {
                    self.beside(a, b);
                }
            }
            2 => {
                let mid_vertices = EDGE.map(|[a, b]| {
                    let mid = self.at((self.vertex[a].location + self.vertex[b].location) / 2.0);
                    self.beside(a, mid);
                    self.beside(mid, b);
                    mid
                });
                for [a, b, c] in FACE_EDGES {
                    self.beside(mid_vertices[a], mid_vertices[b]);
                    self.beside(mid_vertices[b], mid_vertices[c]);
                    self.beside(mid_vertices[c], mid_vertices[a]);
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
                        let walk_a = (walk_a_usize + 1).to_f32().unwrap();
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
                face_vertices.iter().cloned().enumerate().for_each(|(face_index, face_v)| {
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
                        let edge_vertex_a = if array[curr].1 { 0 } else { self.frequency - 2 };
                        let edge_vertex_b = if array[next].1 { 0 } else { self.frequency - 2 };
                        self.beside(edge_v[array[curr].0][edge_vertex_a], edge_v[array[next].0][edge_vertex_b])
                    }
                }
            }
        };
        let locations: Vec<Vector3<f32>> = self.vertex.iter().map(|Vertex { location, .. }| *location).collect();
        self.vertex.iter_mut().for_each(|vertex| sort_vertex(vertex, &locations));
    }

    pub fn set_radius(&mut self, radius: f32) {
        for vertex in &mut self.vertex {
            vertex.location = vertex.location.normalize() * radius;
        }
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

fn sort_vertex(vertex: &mut Vertex, locations: &[Vector3<f32>]) {
    let outward = vertex.location.normalize();
    let vector_to = |index: usize| (locations[index] - vertex.location).normalize();
    let count = vertex.adjacent.len();
    let mut unsorted = vertex.adjacent.clone();
    let first = unsorted.pop().unwrap();
    vertex.adjacent.clear();
    vertex.adjacent.push(first);
    for _walk in 0..count - 1 {
        let Some(top) = vertex.adjacent.last() else {
            panic!("Walking too far!");
        };
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
        let Some(next) = next_position else {
            panic!("No next in {:?}", unsorted)
        };
        let next_index = unsorted[next];
        unsorted.remove(next);
        vertex.adjacent.push(next_index);
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

const PENTAGON_VERTICES: [[(usize, bool); 5]; 12] = [ // (edge_index, alpha_of_edge)
    [(0, true), (1, true), (3, true), (2, true), (4, true)],
    [(7, true), (6, true), (8, true), (5, true), (9, true)],
    [(10, true), (11, true), (0, false), (12, true), (7, false)],
    [(14, true), (13, true), (15, true), (17, true), (16, true)],
    [(18, true), (11, false), (1, false), (19, true), (14, false)],
    [(21, true), (22, true), (20, true), (23, true), (2, false)],
    [(26, true), (24, true), (8, false), (25, true), (15, false)],
    [(27, true), (16, false), (19, false), (3, false), (21, false)],
    [(28, true), (22, false), (27, false), (17, false), (26, false)],
    [(4, false), (23, false), (29, true), (9, false), (12, false)],
    [(28, false), (20, false), (29, false), (5, false), (24, false)],
    [(6, false), (10, false), (18, false), (13, false), (25, false)],
];
