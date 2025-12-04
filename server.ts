// man I don't know why I had to write this

import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";

const filetypes = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".wasm", "application/wasm"],
  [".css", "text/css"],
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  let route = url.pathname;

  if (route === "/") {
    route = "/index.html";
  }

  const filepath = path.join(Deno.cwd(), route);
  if (!await fs.exists(filepath)) {
    return new Response("nope", { status: 404 });
  }

  const filetype = filetypes.get(path.extname(route));

  let body;
  if (route === "/index.html") {
    const html = await Deno.readTextFile(filepath);
    body = html.replace(
      "</head>",
      '<script src="./live-reload.js"></script></head>',
    );
  } else {
    const file = await Deno.open(filepath);
    body = file.readable;
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": filetype ?? "application/octet-stream",
    },
  });
});

// When accessed via localhost, the page's JS opens a WebSocket connection,
// and when that connection is closed, it triggers a page refresh for live reloading.
// When the server code is updated, Deno restarts the server, automatically closing the sockets.
const activeSockets: WebSocket[] = [];

Deno.serve({ port: 8001 }, (req) => {
  const { socket, response } = Deno.upgradeWebSocket(req);

  setInterval(() => socket.send("ping"), 30000);

  activeSockets.push(socket);

  return response;
});

// When the actual page content is updated, manually drain the sockets out of the list,
// and manually close each one.
for await (const _ of Deno.watchFs(".", { recursive: true })) {
  for (const socket of activeSockets.splice(0)) {
    socket.close();
  }
}
