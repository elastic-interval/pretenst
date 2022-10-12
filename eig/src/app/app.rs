use std::time::{Duration};

use chrono::{DateTime, Utc};
use egui_demo_lib::syntax_highlighting::{highlight, CodeTheme};

use crate::tenscript;

/// We derive Deserialize/Serialize so we can persist app state on shutdown.
#[derive(serde::Deserialize, serde::Serialize)]
#[serde(default)] // if we add new fields, give them default values when deserializing old state
pub struct App {
    code: String,
    output: String,

    #[serde(skip)]
    last_saved: Option<DateTime<Utc>>,
}

impl Default for App {
    fn default() -> Self {
        Self {
            // Example stuff:
            code: "(fabric)".into(),
            output: String::new(),
            last_saved: None,
        }
    }
}

impl App {
    /// Called once before the first frame.
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        // This is also where you can customized the look at feel of egui using
        // `cc.egui_ctx.set_visuals` and `cc.egui_ctx.set_fonts`.

        // Load previous app state (if any).
        // Note that you must enable the `persistence` feature for this to work.
        if let Some(storage) = cc.storage {
            return eframe::get_value(storage, eframe::APP_KEY).unwrap_or_default();
        }

        Default::default()
    }
}

impl eframe::App for App {
    /// Called each time the UI needs repainting, which may be many times per second.
    /// Put your widgets into a `SidePanel`, `TopPanel`, `CentralPanel`, `Window` or `Area`.
    fn update(&mut self, ctx: &egui::Context, frame: &mut eframe::Frame) {
        let Self {
            code,
            last_saved,
            output,
        } = self;

        // Examples of how to create different panels and windows.
        // Pick whichever suits you.
        // Tip: a good default choice is to just keep the `CentralPanel`.
        // For inspiration and more examples, go to https://emilk.github.io/egui

        #[cfg(not(target_arch = "wasm32"))] // no File->Quit on web pages!
        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            // The top panel is often a good place for a menu bar:
            egui::menu::bar(ui, |ui| {
                ui.menu_button("File", |ui| {
                    if ui.button("Quit").clicked() {
                        frame.close();
                    }
                });
            });
        });

        egui::SidePanel::left("side_panel").show(ctx, |ui| {
            ui.set_min_width(350.);
            ui.heading("Pretenst");

            match last_saved {
                None => ui.label("Last saved at: Never"),
                Some(time) => ui.label(format!("Last saved at: {time}")),
            };
            ui.add_space(10.0);

            ui.label("Tenscript: ");

            let mut layouter = |ui: &egui::Ui, code: &str, wrap_width: f32| {
                let mut layout_job = highlight(ui.ctx(), &CodeTheme::dark(), code, "clj");
                layout_job.wrap.max_width = wrap_width;
                ui.fonts().layout_job(layout_job)
            };
            let code_editor = ui.add(
                egui::TextEdit::multiline(code)
                    .font(egui::TextStyle::Monospace) // for cursor height
                    .code_editor()
                    .desired_rows(10)
                    .lock_focus(true)
                    .desired_width(f32::INFINITY)
                    .layouter(&mut layouter),
            );
            if code_editor.changed() {
                *output = match tenscript::parse(code) {
                    Ok(fabric_plan) => format!("{fabric_plan:#?}"),
                    Err(error) => format!("{error:#?}"),
                };
            }
            ui.add_space(20.);
            egui::ScrollArea::vertical().show(ui, |ui| {
                let mut layouter = |ui: &egui::Ui, code: &str, wrap_width: f32| {
                    let mut layout_job = highlight(ui.ctx(), &CodeTheme::dark(), code, "rs");
                    layout_job.wrap.max_width = wrap_width;
                    ui.fonts().layout_job(layout_job)
                };
                ui.add(
                    egui::TextEdit::multiline(output)
                        .font(egui::TextStyle::Monospace)
                        .code_editor()
                        .desired_rows(40)
                        .lock_focus(false)
                        .desired_width(f32::INFINITY)
                        .layouter(&mut layouter),
                );
            });

            ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {});

            egui::warn_if_debug_build(ui);
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            //TODO
        });
    }
    /// Called by the frame work to save state before shutdown.
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        self.last_saved = Some(Utc::now());
        eframe::set_value(storage, eframe::APP_KEY, self);
    }

    fn auto_save_interval(&self) -> Duration {
        Duration::from_secs(5)
    }
}
