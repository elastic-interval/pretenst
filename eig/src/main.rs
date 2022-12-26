#![feature(iter_collect_into)]

use std::{iter, mem};
use bytemuck::{cast_slice, Pod, Zeroable};
use cgmath::Point3;
use wgpu::util::DeviceExt;
use winit::{
    event::*,
    event_loop::{ControlFlow, EventLoop},
    window::{Window, WindowBuilder},
};
use winit::dpi::PhysicalSize;

use eig::camera::Camera;
use eig::constants::WorldFeature;
use eig::fabric::Fabric;

use eig::graphics::{get_depth_stencil_state, get_primitive_state, GraphicsWindow};
use eig::tenscript::parse;
use eig::world::World;

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable, Default)]
struct Vertex {
    position: [f32; 4],
    color: [f32; 4],
}

impl From<Point3<f32>> for Vertex {
    fn from(pos: Point3<f32>) -> Self {
        Self {
            position: [pos.x, pos.y, pos.z, 1.0],
            color: [1.0, 1.0, 1.0, 1.0],
        }
    }
}

impl Vertex {
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
    fabric: Fabric,
    world: World,
    vertices: Vec<Vertex>,
    indices: Vec<u16>,
    graphics: GraphicsWindow,
    pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    uniform_buffer: wgpu::Buffer,
    uniform_bind_group: wgpu::BindGroup,
    camera: Camera,
}

impl State {
    async fn new(window: &Window) -> Self {
        let graphics = GraphicsWindow::new(window).await;
        let shader = graphics.get_shader_module();
        let scale = 1.0;
        let aspect = graphics.config.width as f32 / graphics.config.height as f32;
        let camera = Camera::new((3.0 * scale, 1.5 * scale, 3.0 * scale).into(), aspect);
        let mvp_mat = camera.mvp_matrix();
        let mvp_ref: &[f32; 16] = mvp_mat.as_ref();
        let uniform_buffer = graphics.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
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

        let mut world = World::default();
        // world.set_float_value(WorldFeature::ShapingViscosity, 0.01);
        world.set_float_value(WorldFeature::IterationsPerFrame, 10.0);
        // code: ["(5,S92,b(12,S92,MA1),d(11,S92,MA1))"],
        const CODE: &str = "
            (fabric
              (name \"Halo by Crane\")
              (build
                (seed :left)
                (grow A+ 5 (scale 92%)
                    (branch
                        (grow B- 12 (scale 92%))
                        (grow D- 11 (scale 92%))
                     )
                )
              )
            )
            ";
        let plan = parse(CODE).unwrap();
        let fabric = Fabric::with_plan(&plan);

        let vertices = vec![Vertex::default(); 1000];
        let vertex_buffer = graphics.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Vertex Buffer"),
            contents: cast_slice(&vertices),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
        });

        let indices = vec![0u16; 1000];
        let index_buffer = graphics.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Index Buffer"),
            contents: cast_slice(&indices),
            usage: wgpu::BufferUsages::INDEX | wgpu::BufferUsages::COPY_DST,
        });

        Self {
            fabric,
            world,
            vertices,
            indices,
            graphics,
            pipeline,
            vertex_buffer,
            index_buffer,
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

    fn update_from_fabric(&mut self) {
        if !self.fabric.iterate(&self.world) {
            for face in self.fabric.faces.clone() {
                self.fabric.execute_face(&face);
            }
        }
        let num_vertices = self.fabric.joints.len();
        if self.vertices.len() != num_vertices {
            self.vertices = vec![Vertex::default(); num_vertices];
        }
        let updated_vertices = self.fabric.joints
            .iter()
            .map(|joint| Vertex::from(joint.location));
        for (vertex, slot) in updated_vertices.zip(self.vertices.iter_mut()) {
            *slot = vertex;
        }
        let updated_indices = self.fabric.intervals
            .iter()
            .flat_map(|interval| [interval.alpha_index as u16, interval.omega_index as u16]);
        for (index, slot) in updated_indices.zip(self.indices.iter_mut()) {
            *slot = index;
        }
        self.camera.target = self.fabric.midpoint()
    }

    fn update(&mut self, _dt: std::time::Duration) {
        let mvp_mat = self.camera.mvp_matrix();
        let mvp_ref: &[f32; 16] = mvp_mat.as_ref();
        self.update_from_fabric();
        self.graphics.queue.write_buffer(&self.uniform_buffer, 0, cast_slice(mvp_ref));
        self.graphics.queue.write_buffer(&self.vertex_buffer, 0, cast_slice(&self.vertices));
        self.graphics.queue.write_buffer(&self.index_buffer, 0, cast_slice(&self.indices));
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
            render_pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint16);
            render_pass.set_bind_group(0, &self.uniform_bind_group, &[]);
            render_pass.draw_indexed(0..self.indices.len() as u32, 0, 0..1);
        }
        self.graphics.queue.submit(iter::once(encoder.finish()));
        output.present();
        Ok(())
    }
}

fn main() {
    env_logger::init();
    let event_loop = EventLoop::new();
    let window = WindowBuilder::new().with_inner_size(PhysicalSize::new(1600, 1200)).build(&event_loop).unwrap();
    window.set_title("Elastic Interval Geometry");
    let mut state = pollster::block_on(State::new(&window));

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
                    WindowEvent::MouseInput { .. } | WindowEvent::CursorMoved { .. } | WindowEvent::MouseWheel {..} => {
                        state.camera.window_event(event)
                    }
                    _ => {}
                }
            }
            Event::RedrawRequested(_) => {
                let now = std::time::Instant::now();
                let dt = now - start_time;
                state.update(dt);
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

