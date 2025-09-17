import { render_score, default as init } from "./pkg/muzak_web.js";

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
let source;

export async function play(score_text) {
  ctx ??= new AudioContext();
  source?.disconnect();
  source = ctx.createBufferSource();

  const samples = await render(score_text);

  const buffer = ctx.createBuffer(1, samples.length, 48000);
  buffer.copyToChannel(samples, 0);

  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

// very simple hot reload
if (location.hostname === "localhost") {
  const socket = new WebSocket("ws://localhost:8001");
  socket.addEventListener("close", () => {
    location.reload();
  });
}
