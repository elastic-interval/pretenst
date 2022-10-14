use crate::fabric::Fabric;
use three_d::*;

use crate::tenscript;
use crate::world::World;

pub struct App {
    code: String,
    fabric: Fabric,
}

struct RenderState {
    context: Context,
    camera: Camera,
    models: Vec<Gm<Mesh, ColorMaterial>>,
    gui: GUI,
    viewport_zoom: f64,
    light: DirectionalLight,
    control: OrbitControl,
}

impl App {
    pub fn new() -> Self {
        Self {
            // Example stuff:
            code: "(fabric)".into(),
            fabric: Fabric::example(),
        }
    }
    pub fn run(mut self) {
        let window = Window::new(WindowSettings {
            title: "Pretenst".into(),
            max_size: Some((1920, 1600)),
            ..Default::default()
        })
            .unwrap();
        let context = window.gl();

        let camera = Camera::new_perspective(
            window.viewport(),
            vec3(0.0, 60.0, 50.0),
            vec3(0.0, 0.0, 0.0),
            vec3(0.0, 1.0, 0.0),
            degrees(45.0),
            0.01,
            1000.0,
        );

        while self.fabric.iterate(&World::new()) {
            println!("iterate");
        }

        let light = DirectionalLight::new(&context, 0.8, Color::RED, &vec3(5.0, 5.0, 5.0));

        let models = self.fabric.intervals
            .iter()
            .map(|interval| {
                let cpu_mesh = CpuMesh::cylinder(12);
                let [alpha, omega] = [interval.alpha_index, interval.omega_index]
                    .map(|i| self.fabric.joints[i].location.to_vec());
                println!("{alpha:?} -> {omega:?}");
                let length = (omega - alpha).magnitude();
                let radius = if interval.push { 0.05 } else { 0.02 } * 3.0;
                let rotation = Quaternion::from_arc(Vector3::unit_x(), interval.unit, None);
                let position = (alpha + omega) / 2.0;
                let scale = vec3(length, radius, radius);
                println!("pos: {position:?}, rot: {rotation:?}, scale: {scale:?}\n");
                let mut model = Gm::new(Mesh::new(&context, &cpu_mesh), ColorMaterial::default());
                model.set_transformation(
                    Mat4::from_translation(position) *
                        Mat4::from(rotation) *
                        Mat4::from_nonuniform_scale(length, radius, radius) *
                        Mat4::from_translation(vec3(-0.5, 0.0, 0.0))
                );
                model
            })
            .collect();

        let gui = GUI::new(&context);
        let viewport_zoom = 1.0;

        let control = OrbitControl::new(vec3(0.0, 0.0, 0.0), 0.0, 20.0);

        let mut render_state = RenderState {
            context,
            camera,
            control,
            models,
            light,
            gui,
            viewport_zoom,
        };

        window.render_loop(move |frame_input| self.render(&mut render_state, frame_input));
    }

    pub(crate) fn render_side_panel(&mut self, ui: &mut egui::Ui) {
        egui::warn_if_debug_build(ui);
    }

    fn render(
        &mut self,
        render_state: &mut RenderState,
        mut frame_input: FrameInput,
    ) -> FrameOutput {
        // Ensure the viewport matches the current window viewport which changes if the window is resized
        let RenderState { camera, gui, models, light, control, .. } = render_state;

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

        let objects: Vec<_> = models.iter().map(|model| model as &dyn Object).collect();

        frame_input
            .screen()
            .clear(ClearState::color_and_depth(0.3, 0.3, 0.3, 1.0, 1.0))
            .render(&camera, &objects, &[light])
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
        let fabric_plan = tenscript::parse(&self.code);
        if fabric_plan.is_err() {
            return;
        }
    }
}
