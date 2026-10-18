import { loadEnv } from "vite";
import { createLunaHandler } from "./lunaHandler.js";

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 32 * 1024) {
        const error = new Error("payload_too_large");
        error.code = "payload_too_large";
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function mount(server, mode) {
  const env = loadEnv(mode, server.config.root || process.cwd(), "");
  const handle = createLunaHandler({ env });
  server.middlewares.use(async (request, response, next) => {
    const path = (request.url || "").split("?")[0];
    if (path !== "/api/luna") return next();
    try {
      const bodyText = request.method === "POST" ? await readBody(request) : "";
      const result = await handle({
        method: request.method,
        path,
        headers: request.headers,
        bodyText,
        clientId: request.socket?.remoteAddress || "local",
      });
      response.statusCode = result.status;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify(result.json));
    } catch (error) {
      const tooLarge = error?.code === "payload_too_large";
      response.statusCode = tooLarge ? 413 : 500;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(
        JSON.stringify({
          error: {
            code: tooLarge ? "payload_too_large" : "upstream_unavailable",
          },
        }),
      );
    }
  });
}

export function lunaVitePlugin() {
  return {
    name: "brightline-luna",
    configureServer(server) {
      mount(server, server.config.mode);
    },
    configurePreviewServer(server) {
      mount(server, server.config.mode);
    },
  };
}
