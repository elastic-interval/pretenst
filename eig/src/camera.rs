use std::f32::consts::PI;
use cgmath::{EuclideanSpace, Matrix4, perspective, Point3, Rad, Vector3};

pub struct Camera {
    pub position: Point3<f32>,
    pub target: Point3<f32>,
    pub up: Vector3<f32>,
    pub aspect: f32,
}

impl Camera {
    pub fn new(position: Point3<f32>, aspect: f32) -> Self {
        Self {
            position,
            target: Point3::origin(),
            up: Vector3::unit_y(),
            aspect,
        }
    }

    pub fn set_aspect(&mut self, aspect: f32) {
        self.aspect = aspect;
    }

    pub fn mvp_matrix(&self) -> Matrix4<f32> {
        self.projection_matrix() * self.view_matrix()
    }

    fn view_matrix(&self) -> Matrix4<f32> {
        Matrix4::look_at_rh(self.position, self.target, self.up)
    }

    fn projection_matrix(&self) -> Matrix4<f32> {
        OPENGL_TO_WGPU_MATRIX * perspective(Rad(2.0 * PI / 5.0), self.aspect, 1.0, 100.0)
    }
}

const OPENGL_TO_WGPU_MATRIX: Matrix4<f32> = Matrix4::new(
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 0.5, 0.0,
    0.0, 0.0, 0.5, 1.0,
);
