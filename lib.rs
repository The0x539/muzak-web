use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn render_score(score_text: &str, volume: f32) -> Vec<f32> {
    let Ok(score) = muzak::parse(score_text) else {
        return vec![];
    };

    let options = muzak::MixOptions {
        max_duration: None,
        max_tracks: None,
        volume,
    };

    muzak::mix(&score, options).0.collect()
}
