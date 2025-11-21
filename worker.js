import { render_score, default as init } from "./pkg/muzak_web.js";

const initDone = init();

addEventListener('message', async message => {
  await initDone;

  const { score, volume } = message.data;
  const samples = render_score(score, volume);
  const data = { samples, score }
  postMessage(data);
});
