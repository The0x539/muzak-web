import { render_score, default as init } from "./pkg/muzak_web.js";

addEventListener('message', async message => {
  await init();

  const { score, volume } = message.data;
  const samples = render_score(score, volume);
  const data = { samples, score }
  postMessage(data);
});
