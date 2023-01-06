#![feature(iter_collect_into)]

use std::{iter, mem};
use bytemuck::{cast_slice, Pod, Zeroable};
use wgpu::util::DeviceExt;
use winit::{
    event::*,
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};
use winit::dpi::PhysicalSize;

use eig::camera::Camera;
use eig::fabric::Fabric;
use eig::fabric::Stage::{*};

use eig::graphics::{get_depth_stencil_state, get_primitive_state, GraphicsWindow};
use eig::growth::Growth;
use eig::interval::{Interval, StrainLimits};
use eig::interval::Span::{Approaching, Fixed};
use eig::parser::parse;
use eig::world::World;

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable, Default)]
struct Vertex {
    position: [f32; 4],
    color: [f32; 4],
}

impl Vertex {
    pub fn for_interval(interval: &Interval, fabric: &Fabric, strain_limits: Option<StrainLimits>) -> [Vertex; 2] {
        let (alpha, omega) = interval.locations(&fabric.joints);
        let color = match strain_limits {
            None => {
                if interval.role.is_push() {
                    [1.0, 1.0, 1.0, 1.0]
                } else {
                    [0.2, 0.2, 1.0, 1.0]
                }
            }
            Some(limits) => {
                const AMBIENT: f32 = 0.05;
                let nuance = limits.nuance(interval);
                if interval.role.is_push() {
                    [AMBIENT + nuance * (1.0 - AMBIENT), AMBIENT, AMBIENT, 1.0]
                } else {
                    [AMBIENT, AMBIENT + nuance * (1.0 - AMBIENT) * 0.5, AMBIENT + nuance * (1.0 - AMBIENT), 1.0]
                }
            }
        };
        [
            Vertex { position: [alpha.x, alpha.y, alpha.z, 1.0], color },
            Vertex { position: [omega.x, omega.y, omega.z, 1.0], color }
        ]
    }

    const ATTRIBUTES: [wgpu::VertexAttribute; 2] = wgpu::vertex_attr_array![0=>Float32x4, 1=>Float32x4];
    fn desc<'a>() -> wgpu::VertexBufferLayout<'a> {
        wgpu::VertexBufferLayout {
            array_stride: mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &Self::ATTRIBUTES,
        }
    }
}

struct State {
    vertices: Vec<Vertex>,
    graphics: GraphicsWindow,
    pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    uniform_buffer: wgpu::Buffer,
    uniform_bind_group: wgpu::BindGroup,
    camera: Camera,
}

impl State {
    fn new(graphics: GraphicsWindow) -> State {
        let shader = graphics.get_shader_module();
        let scale = 3.0;
        let aspect = graphics.config.width as f32 / graphics.config.height as f32;
        let camera = Camera::new((3.0 * scale, 1.5 * scale, 3.0 * scale).into(), aspect);
        let mvp_mat = camera.mvp_matrix();
        let mvp_ref: &[f32; 16] = mvp_mat.as_ref();
        let uniform_buffer = graphics.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("MVP"),
            contents: cast_slice(mvp_ref),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let uniform_bind_group_layout = graphics.create_uniform_bind_group_layout();
        let uniform_bind_group = graphics.device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &uniform_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: uniform_buffer.as_entire_binding(),
            }],
            label: Some("Uniform Bind Group"),
        });

        let pipeline_layout = graphics.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Render Pipeline Layout"),
            bind_group_layouts: &[&uniform_bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = graphics.device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[Vertex::desc()],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: graphics.config.format,
                    blend: Some(wgpu::BlendState {
                        color: wgpu::BlendComponent::REPLACE,
                        alpha: wgpu::BlendComponent::REPLACE,
                    }),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: get_primitive_state(),
            depth_stencil: Some(get_depth_stencil_state()),
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
        });

        let vertices = vec![Vertex::default(); 1000]; // TODO: why 1000?
        let vertex_buffer = graphics.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Vertex Buffer"),
            contents: cast_slice(&vertices),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
        });

        State {
            vertices,
            graphics,
            pipeline,
            vertex_buffer,
            uniform_buffer,
            uniform_bind_group,
            camera,
        }
    }

    pub fn resize(&mut self, new_size: PhysicalSize<u32>) {
        if new_size.width > 0 && new_size.height > 0 {
            self.graphics.size = new_size;
            self.graphics.config.width = new_size.width;
            self.graphics.config.height = new_size.height;
            self.graphics.surface.configure(&self.graphics.device, &self.graphics.config);
            let aspect = new_size.width as f32 / new_size.height as f32;
            self.camera.set_aspect(aspect);
            let mvp_mat = self.camera.mvp_matrix();
            let mvp_ref: &[f32; 16] = mvp_mat.as_ref();
            self.graphics.queue.write_buffer(&self.uniform_buffer, 0, cast_slice(mvp_ref));
        }
    }

    fn update_from_fabric(&mut self, fabric: &Fabric) {
        let num_vertices = fabric.intervals.len() * 2;
        if self.vertices.len() != num_vertices {
            self.vertices = vec![Vertex::default(); num_vertices];
        }
        let strain_limits = match fabric.stage() {
            Pretensing { .. } | Pretenst => Some(fabric.strain_limits()),
            _ => None
        };
        let updated_vertices = fabric.interval_values()
            .flat_map(|interval| Vertex::for_interval(interval, fabric, strain_limits));
        for (vertex, slot) in updated_vertices.zip(self.vertices.iter_mut()) {
            *slot = vertex;
        }
        self.camera.target_approach(fabric.midpoint())
    }

    fn update(&mut self, fabric: &Fabric) {
        let mvp_mat = self.camera.mvp_matrix();
        let mvp_ref: &[f32; 16] = mvp_mat.as_ref();
        self.update_from_fabric(fabric);
        self.graphics.queue.write_buffer(&self.uniform_buffer, 0, cast_slice(mvp_ref));
        self.graphics.queue.write_buffer(&self.vertex_buffer, 0, cast_slice(&self.vertices));
    }

    fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        let output = self.graphics.surface.get_current_texture()?;
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());
        let depth_view = self.graphics.create_depth_view();
        let mut encoder = self.graphics.create_command_encoder();
        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }),
                        store: true,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &depth_view,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.0),
                        store: false,
                    }),
                    stencil_ops: None,
                }),
            });
            render_pass.set_pipeline(&self.pipeline);
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
            render_pass.set_bind_group(0, &self.uniform_bind_group, &[]);
            render_pass.draw(0..self.vertices.len() as u32, 0..1);
        }
        self.graphics.queue.submit(iter::once(encoder.finish()));
        output.present();
        Ok(())
    }
}

struct ElasticInterval {
    world: World,
    fabric: Fabric,
    iterations_per_frame: usize,
    growth: Growth,
}

impl ElasticInterval {
    pub fn new(code: &str) -> Self {
        Self {
            world: World::default(),
            fabric: Fabric::default(),
            iterations_per_frame: 100,
            growth: Growth::new(parse(code).unwrap()),
        }
    }

    pub fn iterate(&mut self, camera: &mut Camera) {
        for _ in 0..self.iterations_per_frame {
            self.fabric.iterate(&self.world);
        }
        if self.fabric.progress.busy() {
            return;
        }
        match self.fabric.stage() {
            Empty => {
                self.growth.init(&mut self.fabric);
                self.fabric.set_stage(GrowStep);
            }
            GrowStep => {
                if self.growth.is_growing() {
                    self.growth.growth_step(&mut self.fabric);
                    self.fabric.set_stage(GrowApproach);
                } else if self.growth.needs_shaping() {
                    self.growth.create_shapers(&mut self.fabric);
                    self.fabric.set_stage(ShapingStart);
                }
            }
            GrowApproach => {
                self.finish_approach();
                self.fabric.set_stage(GrowCalm);
            }
            GrowCalm => {
                self.fabric.set_stage(GrowStep);
            }
            ShapingStart => {
                self.fabric.set_stage(ShapingApproach);
            }
            ShapingApproach => {
                self.finish_approach();
                self.fabric.set_stage(Shaped);
            }
            Shaped => {
                self.growth.complete_shapers(&mut self.fabric);
                self.fabric.set_stage(ShapedApproach);
            }
            ShapedApproach => {
                self.finish_approach();
                self.fabric.set_stage(ShapingDone);
            }
            ShapingDone => {
                self.fabric.set_stage(Vulcanize);
            }
            Vulcanize => {
                if self.growth.vulcanize(&mut self.fabric) {
                    self.fabric.set_stage(VulcanizeApproach);
                } else {
                    self.set_pretensing(camera);
                }
            }
            VulcanizeApproach => {
                self.finish_approach();
                self.set_pretensing(camera);
            }
            Pretensing => {
                self.fabric.set_stage(Pretenst);
            }
            Pretenst => {}
        }
    }

    fn finish_approach(&mut self) {
        for interval in self.fabric.intervals.values_mut() {
            if let Approaching { length, .. } = interval.span {
                interval.span = Fixed { length }
            }
        }
    }

    fn set_pretensing(&mut self, camera: &mut Camera) {
        let up = self.fabric.prepare_for_pretensing(1.03);
        camera.go_up(up);
        self.fabric.set_stage(Pretensing)
    }
}

fn main() {
    env_logger::init();
    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_inner_size(PhysicalSize::new(1600, 1200))
        .build(&event_loop)
        .unwrap();
    window.set_title("Elastic Interval Geometry");
    let graphics = pollster::block_on(GraphicsWindow::new(&window));
    let mut state = State::new(graphics);
    let mut elastic = ElasticInterval::new(CODE);

    let start_time = std::time::Instant::now();
    let mut last_frame = std::time::Instant::now();
    let mut frame_no = 0;

    event_loop.run(move |event, _, control_flow| {
        match event {
            Event::WindowEvent {
                ref event,
                window_id,
            } if window_id == window.id() => {
                match event {
                    WindowEvent::CloseRequested | WindowEvent::KeyboardInput {
                        input: KeyboardInput {
                            state: ElementState::Pressed,
                            virtual_keycode: Some(VirtualKeyCode::Escape),
                            ..
                        },
                        ..
                    } => *control_flow = ControlFlow::Exit,
                    WindowEvent::Resized(physical_size) => {
                        state.resize(*physical_size);
                    }
                    WindowEvent::ScaleFactorChanged { new_inner_size, .. } => {
                        state.resize(**new_inner_size);
                    }
                    WindowEvent::MouseInput { .. } | WindowEvent::CursorMoved { .. } | WindowEvent::MouseWheel { .. } => {
                        state.camera.window_event(event)
                    }
                    _ => {}
                }
            }
            Event::RedrawRequested(_) => {
                let now = std::time::Instant::now();
                let dt = now - start_time;
                elastic.iterate(&mut state.camera);
                state.update(&elastic.fabric);
                let frame_time = now - last_frame;
                frame_no += 1;
                let avg_time = dt.as_secs_f64() / (frame_no as f64);
                last_frame = now;
                if frame_no % 100 == 0 {
                    println!("frame {:<8} {}µs/frame ({:.1} FPS avg)",
                             frame_no, frame_time.as_micros(), 1.0 / avg_time);
                }
                match state.render() {
                    Ok(_) => {}
                    Err(wgpu::SurfaceError::Lost) => state.resize(state.graphics.size),
                    Err(wgpu::SurfaceError::OutOfMemory) => *control_flow = ControlFlow::Exit,
                    Err(e) => eprintln!("{e:?}"),
                }
            }
            Event::MainEventsCleared => {
                window.request_redraw();
            }
            _ => {}
        }
    });
}

const CODE: &str = "
            (fabric
                  (name \"Halo by Crane\")
                  (build
                        (seed :left)
                        (grow A+ 5 (scale 92%)
                            (branch
                                    (grow B- 12 (scale 92%)
                                         (branch (mark A+ :halo-end))
                                    )
                                    (grow D- 11 (scale 92%)
                                        (branch (mark A+ :halo-end))
                                    )
                             )
                        )
                  )
                  (shape
                    (pull-together :halo-end)
                    (vulcanize :bow-tie)
                  )
            )
            ";
