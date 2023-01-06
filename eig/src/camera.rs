use std::f32::consts::PI;
use cgmath::{Deg, InnerSpace, Matrix4, perspective, Point3, point3, Rad, Transform, vec3, Vector3};
use winit::dpi::PhysicalPosition;
use winit::event::{ElementState, MouseScrollDelta, WindowEvent};

const TARGET_ATTRACTION: f32 = 0.03;

pub struct Camera {
    pub position: Point3<f32>,
    pub target: Point3<f32>,
    pub up: Vector3<f32>,
    pub aspect: f32,
    pub moving_mouse: PhysicalPosition<f64>,
    pub pressed_mouse: Option<PhysicalPosition<f64>>,
}

impl Camera {
    pub fn new(position: Point3<f32>, aspect: f32) -> Self {
        Self {
            position,
            target: point3(0.0, 3.0, 0.0),
            up: Vector3::unit_y(),
            aspect,
            moving_mouse: PhysicalPosition::new(0.0, 0.0),
            pressed_mouse: None,
        }
    }

    pub fn window_event(&mut self, event: &WindowEvent) {
        match event {
            WindowEvent::MouseInput { state, .. } => {
                match state {
                    ElementState::Pressed => { self.pressed_mouse = Some(self.moving_mouse) }
                    ElementState::Released => { self.pressed_mouse = None }
                }
            }
            WindowEvent::CursorMoved { position, .. } => {
                self.moving_mouse = *position;
                if let Some(rotation) = self.rotation() {
                    self.position = self.target - rotation.transform_vector(self.target - self.position);
                    self.pressed_mouse = Some(self.moving_mouse);
                }
            }
            WindowEvent::MouseWheel { delta: MouseScrollDelta::PixelDelta(pos), .. } => {
                let scroll = pos.y as f32 * SPEED.z;
                let gaze = self.target - self.position;
                if gaze.magnitude() - scroll > 1.0 {
                    self.position += gaze.normalize() * scroll;
                }
            }
            _ => {}
        }
    }

    pub fn target_approach(&mut self, target: Point3<f32>) {
        self.target += (target - self.target) * TARGET_ATTRACTION;
    }

    pub fn set_aspect(&mut self, aspect: f32) {
        self.aspect = aspect;
    }

    pub fn mvp_matrix(&self) -> Matrix4<f32> {
        self.projection_matrix() * self.view_matrix()
    }

    pub fn go_up(&mut self, up: f32) {
        self.position.y += up;
        self.target.y += up;
    }

    fn view_matrix(&self) -> Matrix4<f32> {
        Matrix4::look_at_rh(self.position, self.target, self.up)
    }

    fn projection_matrix(&self) -> Matrix4<f32> {
        OPENGL_TO_WGPU_MATRIX * perspective(Rad(2.0 * PI / 5.0), self.aspect, 1.0, 100.0)
    }

    fn rotation(&self) -> Option<Matrix4<f32>> {
        let (dx, dy) = self.angles()?;
        let rot_x = Matrix4::from_angle_y(dx);
        let axis = Vector3::unit_y().cross((self.target - self.position).normalize());
        let rot_y = Matrix4::from_axis_angle(axis, dy);
        Some(rot_x * rot_y)
    }

    fn angles(&self) -> Option<(Deg<f32>, Deg<f32>)> {
        let pressed = self.pressed_mouse?;
        let PhysicalPosition { x, y } = self.moving_mouse;
        let dx = (pressed.x - x) as f32;
        let dy = (y - pressed.y) as f32;
        Some((Deg(dx * SPEED.x), Deg(dy * SPEED.y)))
    }
}

const SPEED: Vector3<f32> = vec3(0.5, 0.4, 0.01);

const OPENGL_TO_WGPU_MATRIX: Matrix4<f32> = Matrix4::new(
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 0.5, 0.0,
    0.0, 0.0, 0.5, 1.0,
);
