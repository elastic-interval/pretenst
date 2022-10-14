use three_d::*;

use crate::tenscript;

pub struct App {
    code: String,
    output: String,
}

struct RenderState {
    context: Context,
    camera: Camera,
    cpu_mesh: CpuMesh,
    model: Gm<Mesh, ColorMaterial>,
    gui: GUI,
    viewport_zoom: f64,
}

impl App {
    pub fn new() -> Self {
        Self {
            // Example stuff:
            code: "(fabric)".into(),
            output: "".into(),
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
            vec3(0.0, 0.0, 1.3),
            vec3(0.0, 0.0, 0.0),
            vec3(0.0, 1.0, 0.0),
            degrees(45.0),
            0.1,
            10.0,
        );

        let cpu_mesh = CpuMesh {
            positions: Positions::F32(vec![
                vec3(0.5, -0.5, 0.0),  // bottom right
                vec3(-0.5, -0.5, 0.0), // bottom left
                vec3(0.0, 0.5, 0.0),   // top
            ]),
            colors: Some(vec![
                Color::new(255, 0, 0, 255), // bottom right
                Color::new(0, 255, 0, 255), // bottom left
                Color::new(0, 0, 255, 255), // top
            ]),
            ..Default::default()
        };

        let model: Gm<Mesh, ColorMaterial> =
            Gm::new(Mesh::new(&context, &cpu_mesh), ColorMaterial::default());

        let gui = GUI::new(&context);
        let viewport_zoom = 1.0;

        let mut render_state = RenderState {
            context,
            camera,
            cpu_mesh,
            model,
            gui,
            viewport_zoom,
        };

        window.render_loop(move |frame_input| self.render(&mut render_state, frame_input));
    }

    pub(crate) fn render_side_panel(&mut self, ui: &mut egui::Ui) {
        egui::warn_if_debug_build(ui);
    }

    fn render(&mut self, render_state: &mut RenderState, mut frame_input: FrameInput) -> FrameOutput {
        // Ensure the viewport matches the current window viewport which changes if the window is resized
        let RenderState {
            camera,
            model,
            gui,
            ..
        } = render_state;


        let mut panel_width = 0.0;
        camera.set_viewport(frame_input.viewport);
        gui.update(
            &mut frame_input.events,
            frame_input.accumulated_time,
            frame_input.device_pixel_ratio,
            |gui_context| {
                self.render_sidebar(gui_context);
                panel_width = gui_context.used_size().x as f64;
            },
        );

        // Set the current transformation of the triangle
        model.set_transformation(Mat4::from_angle_y(radians(
            (frame_input.accumulated_time * 0.005) as f32,
        )));

        camera.set_viewport(Viewport {
            x: (panel_width * frame_input.device_pixel_ratio) as i32,
            y: 0,
            width: frame_input.viewport.width
                - (panel_width * frame_input.device_pixel_ratio) as u32,
            height: frame_input.viewport.height,
        });


        // Get the screen render target to be able to render something on the screen
        frame_input
            .screen()
            // Clear the color and depth of the screen render target
            .clear(ClearState::color_and_depth(0.8, 0.8, 0.8, 1.0, 1.0))
            // Render the triangle with the color material which uses the per vertex colors defined at construction
            .render(&camera, &[&model], &[])
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
                    .desired_width(300.0)
            );
            let execute_button = ui.add_sized(
                [300.0, 30.0],
                Button::new("Execute")
            );
            if execute_button.clicked() {}
        });
    }
}