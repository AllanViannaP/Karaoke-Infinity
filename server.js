const fs = require("fs");
const http = require("http");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    send(res, 405, "Metodo nao permitido");
    return;
  }

  let pathname = "/";
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    pathname = decodeURIComponent(url.pathname);
  } catch {
    send(res, 400, "URL invalida");
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  const requestedPath = path.normalize(path.join(publicDir, pathname));
  if (!requestedPath.startsWith(publicDir)) {
    send(res, 403, "Acesso negado");
    return;
  }

  fs.stat(requestedPath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      send(res, 404, "Arquivo nao encontrado");
      return;
    }

    const type = mimeTypes[path.extname(requestedPath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(requestedPath).pipe(res);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Karaoke local pronto em http://127.0.0.1:${port}`);
  console.log("Pressione Ctrl+C para fechar.");
});

