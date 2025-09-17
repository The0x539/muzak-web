import { render_score, default as init } from "./pkg/muzak_web.js";

await init();

let worker;
function renderAsync(score, volume) {
  worker ??= new Worker("./worker.js", { type: "module" });
  return new Promise(resolve => {
    const listener = message => {
      // make sure we're not getting the result of a past dispatch
      if (message.data.score === score) {
        // stop listening for the results of future dispatches
        worker.removeEventListener("message", listener);
        resolve(message.data.samples);
      }
    };
    worker.addEventListener("message", listener);
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
function makeBufferSource() {
  ctx ??= new AudioContext();
  source?.disconnect();
  source = ctx.createBufferSource();
  source.connect(ctx.destination);
  return source;
}

export async function play(score_text) {
  const source = await makeBufferSource();
  const samples = await render(score_text);

  const buffer = ctx.createBuffer(1, samples.length, 48000);
  buffer.copyToChannel(samples, 0);

  source.buffer = buffer;
  source.start();
}

// very simple hot reload
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  const socket = new WebSocket("ws://localhost:8001");
  socket.addEventListener("close", () => {
    location.reload();
  });
}
