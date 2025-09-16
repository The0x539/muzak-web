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
  const route = url.pathname;
  if (route === "/") {
    return new Response(null, { status: 308, headers: { "Location": "demo/index.html" }});
  }

  const filepath = path.join(Deno.cwd(), route);
  if (!await fs.exists(filepath)) {
    return new Response("nope", { status: 404 });
  }

  const filetype = filetypes.get(path.extname(route)) ?? "application/octet-stream";
  
  const file = await Deno.open(filepath);
  return new Response(file.readable, {
    status: 200,
    headers: {
      "Content-Type": filetype,
    }
  });
});

