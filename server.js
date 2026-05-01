"use strict";

const { createReadStream } = require("fs");
const { stat } = require("fs/promises");
const http = require("http");
const path = require("path");

const HOST = process.env.HOST || "127.0.0.1";
const DEFAULT_PORT = 4173;
const PUBLIC_DIR = path.resolve(__dirname, "public");

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"]
]);

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

function getPort(value) {
  const port = Number(value || DEFAULT_PORT);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_PORT;
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    ...BASE_HEADERS,
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function resolvePublicPath(pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const requestedPath = path.resolve(PUBLIC_DIR, relativePath);
  const publicRoot = `${PUBLIC_DIR}${path.sep}`;

  if (requestedPath !== PUBLIC_DIR && !requestedPath.startsWith(publicRoot)) {
    return null;
  }

  return requestedPath;
}

async function handleRequest(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) {
    send(res, 405, "Method not allowed");
    return;
  }

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || HOST}`);
  } catch {
    send(res, 400, "Invalid URL");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    send(res, 400, "Invalid URL encoding");
    return;
  }

  const requestedPath = resolvePublicPath(pathname);
  if (!requestedPath) {
    send(res, 403, "Access denied");
    return;
  }

  try {
    const fileStat = await stat(requestedPath);
    if (!fileStat.isFile()) {
      send(res, 404, "File not found");
      return;
    }

    const type = MIME_TYPES.get(path.extname(requestedPath).toLowerCase()) || "application/octet-stream";
    res.writeHead(200, {
      ...BASE_HEADERS,
      "Content-Type": type,
      "Content-Length": fileStat.size
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    createReadStream(requestedPath)
      .on("error", () => {
        if (!res.headersSent) send(res, 500, "File read failed");
        else res.destroy();
      })
      .pipe(res);
  } catch {
    send(res, 404, "File not found");
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    if (!res.headersSent) send(res, 500, "Internal server error");
    else res.destroy();
  });
});

server.listen(getPort(process.env.PORT), HOST, () => {
  const { address, port } = server.address();
  console.log(`Karaoke Infinity is ready at http://${address}:${port}`);
  console.log("Press Ctrl+C to close.");
});
