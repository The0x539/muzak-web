export let render;

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
  const pMuzak = (async () => {
    const module = await import("./pkg/muzak_web.js");
    await module.default();
    return module;
  })();

  render = async function render(score, volume = 0.2) {
    const muzak = await pMuzak;
    return muzak.render_score(score, volume);
  }
}

export function buildWAV(samples, sampleRate) {
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
