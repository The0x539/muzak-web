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

const getElements = tag => [...document.getElementsByTagName(tag)];

for (const code of getElements('code')) {
  const input = document.createElement('input');
  input.value = code.innerText;
  code.after(input);
  code.remove();

  const button = document.createElement('button');
  button.innerText = '▶ play';
  input.before(button);

  button.addEventListener('click', () => play(input.value));
}

function copyText(event) {
  navigator.clipboard.writeText(event.target.innerText);
  event.preventDefault();

  const bubble = document.createElement('span');
  bubble.ariaHidden = "true";
  bubble.innerText = event.target.innerText;
  bubble.classList.add('copy-anim');

  const rect = event.target.getClientRects()[0];
  bubble.style.left = rect.x + window.scrollX + 'px';
  bubble.style.top = rect.y + window.scrollY + 'px';

  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1000);
}

function preventAccidentalSelect(event) {
  if (event.detail > 1) {
    window.getSelection().removeAllRanges();
    event.preventDefault();
  }
}

for (const mark of getElements('mark')) {
  mark.addEventListener('click', copyText);
  mark.addEventListener('mousedown', preventAccidentalSelect);
}

const volumeControl = document.getElementById('volume');
//volumeControl.valueAsNumber = 1.0;

class Player {
  static audioCtx;
  static current;

  constructor() {
    this.ctx = Player.audioCtx ??= new AudioContext();

    this.source = this.ctx.createBufferSource();
    this.gain = this.ctx.createGain();
    this.sink = this.ctx.destination;

    this.setGain(volumeControl.valueAsNumber);

    this.source.connect(this.gain)
    this.gain.connect(this.sink);
  }

  play(samples) {
    const buffer = this.ctx.createBuffer(1, samples.length, 48000);
    buffer.copyToChannel(samples, 0);
    this.source.buffer = buffer;
    this.source.start();
  }

  setGain(gain) {
    this.gain.gain.value = gain;
  }

  stop() {
    this.source.disconnect();
  }
}

export function stop() {
  Player.current?.stop();
}

export async function play(score_text) {
  stop();
  const samples = await render(score_text);
  Player.current = new Player();
  Player.current.play(samples);
}

export function setVolume(volume) {
  Player.current?.setGain(volume);
}

// very simple hot reload
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  const socket = new WebSocket("ws://localhost:8001");
  socket.addEventListener("close", () => {
    location.reload();
  });
}

