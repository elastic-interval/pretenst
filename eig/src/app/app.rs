use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Duration;

use cgmath::{EuclideanSpace, InnerSpace, Quaternion, vec3, Vector3};
use three_d::*;

use crate::fabric::Fabric;
use crate::tenscript::parse;
use crate::world::World;

struct ThreadShared {
    fabric: Fabric,
    world: World,
}

impl ThreadShared {
    fn iterate(&mut self) -> bool {
        if self.fabric.iterate(&self.world) {
            return true;
        }
        let mut executed = false;
        self.fabric.faces.clone().iter().for_each(|face| {
            if self.fabric.execute_face(face) {
                executed = true;
            }
        });
        executed
    }
}

pub struct App {
    code: String,
    rw_lock: Arc<RwLock<ThreadShared>>,
}

struct RenderState {
    context: Context,
    camera: Camera,
    models: Vec<Gm<Mesh, PhysicalMaterial>>,
    gui: GUI,
    viewport_zoom: f64,
    light: DirectionalLight,
    control: OrbitControl,
}

const CODE: &str = "
(fabric
  (name \"Knee\")
  (build
    (seed :left)
    (grow A- 3)
  )
)
";

impl Default for App {
    fn default() -> Self {
        let mut world = World::new();
        // world.iterations_per_frame = 2.0;
        world.shaping_drag = 0.003;
        let plan = parse(CODE).unwrap();
        let fabric = Fabric::with_plan(&plan);
        Self {
            code: CODE.into(),
            rw_lock: Arc::new(RwLock::new(ThreadShared { world, fabric })),
        }
    }
}

impl App {
    pub fn run(mut self) {
        let shared_clone = self.rw_lock.clone();
        thread::spawn(move || {
            loop {
                let _busy = shared_clone.write().unwrap().iterate();
                thread::sleep(Duration::from_millis(10));
            }
        });

        let window = Window::new(WindowSettings {
            title: "Pretenst".into(),
            max_size: Some((1920, 1600)),
            ..Default::default()
        })
            .unwrap();
        let context = window.gl();

        let camera = Camera::new_perspective(
            window.viewport(),
            vec3(0.0, 0.0, 8.0),
            vec3(0.0, 3.0, 0.0),
            vec3(0.0, 1.0, 0.0),
            degrees(45.0),
            0.01,
            1000.0,
        );

        let light = DirectionalLight::new(&context, 10.0, Color::WHITE, &vec3(0.0, -1.0, 0.0));

        let models: Vec<Gm<Mesh, PhysicalMaterial>> = Vec::new();
        let gui = GUI::new(&context);
        let viewport_zoom = 1.0;
        let control = OrbitControl::new(*camera.target(), 0.0, 100.0);
        let mut render_state = RenderState { context, camera, control, models, light, gui, viewport_zoom };

        window.render_loop(move |frame_input| self.render(&mut render_state, frame_input));
    }

    fn render(&mut self, render_state: &mut RenderState, mut frame_input: FrameInput) -> FrameOutput {
        // Ensure the viewport matches the current window viewport which changes if the window is resized
        let RenderState { context, camera, gui, models, light, control, .. } = render_state;

        let mut panel_width = 0.0;
        gui.update(
            &mut frame_input.events,
            frame_input.accumulated_time,
            frame_input.device_pixel_ratio,
            |gui_context| {
                self.render_sidebar(gui_context);
                panel_width = gui_context.used_size().x as f64;
            },
        );

        camera.set_viewport(Viewport {
            x: (panel_width * frame_input.device_pixel_ratio) as i32,
            y: 0,
            width: frame_input.viewport.width
                - (panel_width * frame_input.device_pixel_ratio) as u32,
            height: frame_input.viewport.height,
        });

        control.handle_events(camera, &mut frame_input.events);

        light.direction = camera.view_direction().cross(camera.right_direction()).normalize();

        let shared = self.rw_lock.read().unwrap();
        let fabric = &shared.fabric;
        camera.set_view(*camera.position(), fabric.midpoint(), *camera.up());
        if fabric.intervals.len() != models.len() {
            *models = self.rw_lock.read().unwrap().fabric.intervals
                .iter()
                .map(|_interval| {
                    let cpu_mesh = CpuMesh::cylinder(12);
                    let material = PhysicalMaterial::new_opaque(context, &CpuMaterial::default());
                    Gm::new(Mesh::new(context, &cpu_mesh), material)
                })
                .collect();
        }
        let objects: Vec<_> =
            models
                .iter_mut()
                .zip(fabric.intervals.iter())
                .map(|(model, interval)| {
                    let [alpha, omega] = [interval.alpha_index, interval.omega_index]
                        .map(|i| fabric.joints[i].location.to_vec());
                    let length = (omega - alpha).magnitude();
                    let radius = if interval.role.push { 0.1 } else { 0.02 };
                    let rotation = Quaternion::from_arc(Vector3::unit_x(), interval.unit, None);
                    let position = (alpha + omega) / 2.0;
                    model.set_transformation(
                        Mat4::from_translation(position) *
                            Mat4::from(rotation) *
                            Mat4::from_nonuniform_scale(length, radius, radius) *
                            Mat4::from_translation(vec3(-0.5, 0.0, 0.0))
                    );
                    model as &dyn Object
                })
                .collect();

        frame_input
            .screen()
            .clear(ClearState::color_and_depth(0.0, 0.0, 0.0, 1.0, 1.0))
            .render(camera, &objects, &[light])
            .write(|| gui.render(frame_input.viewport));

        // Returns default frame output to end the frame
        FrameOutput::default()
    }

    fn render_sidebar(&mut self, gui_context: &egui::Context) {
        use three_d::egui::*;

        SidePanel::left("side_panel").show(gui_context, |ui| {
            ui.set_min_width(300.0);
            ui.heading("Pretenst");
            ui.add_space(10.0);
            ui.label("Tenscript:");
            ui.add_space(5.0);
            ui.add(
                TextEdit::multiline(&mut self.code)
                    .code_editor()
                    .desired_rows(20)
                    .desired_width(300.0),
            );
            let execute_button = ui.add_sized([300.0, 30.0], Button::new("Execute"));
            if execute_button.clicked() {
                self.execute_tenscript();
            }
        });
    }

    fn execute_tenscript(&mut self) {
        let Ok(fabric_plan) = parse(&self.code) else {
            return;
        };
        println!("Plan: {:?}", fabric_plan);
        let mut shared = self.rw_lock.write().unwrap();
        shared.fabric = Fabric::with_plan(&fabric_plan)
    }
}
