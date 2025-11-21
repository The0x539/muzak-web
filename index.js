let render;

if (window.Worker) {
  const worker = new Worker("./worker.js", { type: "module" });

  render = function render(score, volume = 0.2) {
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
} else {
  let pMuzak = (async () => {
    const module = await import("./pkg/muzak_web.js");
    await module.default();
    return module;
  })();

  render = async function render(score, volume = 0.2) {
    const muzak = await pMuzak;
    return muzak.render_score(score, volume);
  }
}

const getElements = tag => [...document.getElementsByTagName(tag)];

for (const code of getElements('code')) {
  const container = document.createElement('div');

  const input = document.createElement('input');
  input.value = code.innerText;

  const button = document.createElement('button');
  button.innerText = '▶ play';

  container.appendChild(button);
  container.appendChild(input);

  code.after(container);
  code.remove();

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
  bubble.style.fontSize = getComputedStyle(event.target).fontSize;

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

class ByteBuffer {
  constructor(capacity) {
    this.buffer = new ArrayBuffer(capacity);
    this.view = new DataView(this.buffer);
    this.len = 0;
  }

  u8(v) {
    this.view.setUint8(this.len, v);
    this.len += 1;
  }

  u16(v) {
    this.view.setUint16(this.len, v, true);
    this.len += 2;
  }

  u32(v) {
    this.view.setUint32(this.len, v, true);
    this.len += 4;
  }

  str(v) {
    for (let i = 0; i < v.length; i++) {
      this.view.setUint8(this.len + i, v.codePointAt(i));
    }
    this.len += v.length;
  }
}

function buildWAV(samples, sampleRate) {
  const bytesPerSample = samples.BYTES_PER_ELEMENT;
  const bitsPerSample = 8 * bytesPerSample;
  const dataBytes = bytesPerSample * samples.length;

  const formatTag = samples instanceof Float32Array ? 3 : 1;

  const header = new ByteBuffer(44);

  header.str('RIFF');
  header.u32(header.buffer.byteLength + dataBytes - 4);
  header.str('WAVE');

  header.str('fmt ');
  header.u32(16);                          // cksize
  header.u16(formatTag);                   // wFormatTag
  header.u16(1);                           // nChannels
  header.u32(sampleRate);                  // nSamplesPerSec
  header.u32(sampleRate * bytesPerSample); // nAvgBytesPerSec
  header.u16(bytesPerSample);              // nBlockAlign
  header.u16(bitsPerSample);               // wBitsPerSample

  header.str('data');
  header.u32(dataBytes);

  return new Blob([header.buffer, samples], { type: "audio/wav" });
}

const audioElem = document.getElementsByTagName('audio')[0];

export async function play(score_text) {
  const samples = await render(score_text);
  audioElem.src = URL.createObjectURL(buildWAV(samples, 48000));
  audioElem.play();
}

// very simple hot reload
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  const socket = new WebSocket("ws://localhost:8001");
  socket.addEventListener("close", () => {
    location.reload();
  });
}

