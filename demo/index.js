import { render_score, default as init } from "../pkg/muzak_web.js";

await init();

function renderAsync(score, volume) {
  const worker = new Worker("./worker.js", { type: "module" });
  return new Promise(resolve => {
    worker.onmessage = message => resolve(message.data);
    worker.postMessage({ score, volume });
  });
}

function render(score, volume = 0.2) {
  if (window.Worker) {
    return renderAsync(score, volume);
  } else {
    return render_score(score_text, volume);
  }
}

let ctx;
export async function play(score_text) {
  ctx ??= new AudioContext();

  const samples = await render(score_text);

  const source = ctx.createBufferSource();

  const buffer = ctx.createBuffer(1, samples.length, 48000);
  buffer.copyToChannel(samples, 0);

  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}
