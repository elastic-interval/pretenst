use std::f32::consts::PI;
use cgmath::{Matrix4, perspective, Point3, point3, Rad, Vector3};
use winit::dpi::PhysicalPosition;
use winit::event::{ElementState, WindowEvent};

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
                if let Some(pressed) = self.pressed_mouse {
                    let PhysicalPosition { x, y } = self.moving_mouse;
                    println!("({:.1}, {:.1})", x - pressed.x, y - pressed.y)
                }
            }
            _ => {}
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
