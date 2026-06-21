const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "shakeup.db");
const MAX_BODY_SIZE = 1_000_000;

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    image TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Milk-shake',
    available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const seedProducts = [
  {
    name: "Órbita de Chocolate",
    description: "Milk-shake de chocolate com calda cremosa, brownie e cobertura azul de hortelã.",
    price: 18.9,
    image: "img/choco-power.jpg",
    category: "Chocolate",
  },
  {
    name: "Nebulosa de Morango",
    description: "Milk-shake de morango com chantilly, frutas vermelhas e confeitos estelares.",
    price: 17.9,
    image: "img/morango-dream.jpg",
    category: "Frutas",
  },
  {
    name: "Cookies Alien",
    description: "Milk-shake de baunilha com cookies crocantes e cobertura verde de limão.",
    price: 19.9,
    image: "img/cookies-blast.jpg",
    category: "Cookies",
  },
  {
    name: "Cometa Caramelo",
    description: "Milk-shake de doce de leite com caramelo, chantilly e brilho galáctico.",
    price: 18.9,
    image: "img/doce-caramelo.jpg",
    category: "Caramelo",
  },
];

if (db.prepare("SELECT COUNT(*) AS total FROM products").get().total === 0) {
  const insertSeed = db.prepare(`
    INSERT INTO products (name, description, price, image, category, available)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  db.exec("BEGIN");
  try {
    seedProducts.forEach((product) => {
      insertSeed.run(product.name, product.description, product.price, product.image, product.category);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function productFromRow(row) {
  return row ? { ...row, available: Boolean(row.available) } : null;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
        reject(Object.assign(new Error("Corpo da requisição muito grande."), { status: 413 }));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error("JSON inválido."), { status: 400 }));
      }
    });

    request.on("error", reject);
  });
}

function normalizeProduct(payload) {
  const product = {
    name: String(payload.name || "").trim(),
    description: String(payload.description || "").trim(),
    price: Number(payload.price),
    image: String(payload.image || "").trim(),
    category: String(payload.category || "Milk-shake").trim(),
    available: payload.available === undefined ? true : Boolean(payload.available),
  };

  const errors = [];
  if (product.name.length < 3) errors.push("O nome deve ter pelo menos 3 caracteres.");
  if (product.description.length < 10) errors.push("A descrição deve ter pelo menos 10 caracteres.");
  if (!Number.isFinite(product.price) || product.price < 0) errors.push("Informe um preço válido.");
  if (!product.image) errors.push("Informe o caminho ou URL da imagem.");
  if (!product.category) errors.push("Informe uma categoria.");

  return { product, errors };
}

function parseId(pathname) {
  const match = pathname.match(/^\/api\/products\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  if (url.pathname === "/api/products" && request.method === "GET") {
    const onlyAvailable = url.searchParams.get("available") === "1";
    const rows = onlyAvailable
      ? db.prepare("SELECT * FROM products WHERE available = 1 ORDER BY id DESC").all()
      : db.prepare("SELECT * FROM products ORDER BY id DESC").all();
    sendJson(response, 200, rows.map(productFromRow));
    return;
  }

  if (url.pathname === "/api/products" && request.method === "POST") {
    const { product, errors } = normalizeProduct(await readJson(request));
    if (errors.length) {
      sendJson(response, 422, { message: "Revise os dados do produto.", errors });
      return;
    }

    const result = db.prepare(`
      INSERT INTO products (name, description, price, image, category, available)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(product.name, product.description, product.price, product.image, product.category, Number(product.available));
    const created = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
    sendJson(response, 201, productFromRow(created));
    return;
  }

  const id = parseId(url.pathname);
  if (id !== null && request.method === "GET") {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!product) {
      sendJson(response, 404, { message: "Produto não encontrado." });
      return;
    }
    sendJson(response, 200, productFromRow(product));
    return;
  }

  if (id !== null && request.method === "PUT") {
    if (!db.prepare("SELECT id FROM products WHERE id = ?").get(id)) {
      sendJson(response, 404, { message: "Produto não encontrado." });
      return;
    }

    const { product, errors } = normalizeProduct(await readJson(request));
    if (errors.length) {
      sendJson(response, 422, { message: "Revise os dados do produto.", errors });
      return;
    }

    db.prepare(`
      UPDATE products
      SET name = ?, description = ?, price = ?, image = ?, category = ?,
          available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(product.name, product.description, product.price, product.image, product.category, Number(product.available), id);
    const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    sendJson(response, 200, productFromRow(updated));
    return;
  }

  if (id !== null && request.method === "DELETE") {
    const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
    if (result.changes === 0) {
      sendJson(response, 404, { message: "Produto não encontrado." });
      return;
    }
    response.writeHead(204, { "Access-Control-Allow-Origin": "*" });
    response.end();
    return;
  }

  sendJson(response, 404, { message: "Rota da API não encontrada." });
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname === "/admin" ? "/admin.html" : pathname;
  const filePath = path.resolve(ROOT, `.${decodeURIComponent(requestedPath)}`);
  const extension = path.extname(filePath).toLowerCase();

  if (!filePath.startsWith(`${ROOT}${path.sep}`) || !mimeTypes[extension]) {
    sendJson(response, 404, { message: "Arquivo não encontrado." });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, error.code === "ENOENT" ? 404 : 500, {
        message: error.code === "ENOENT" ? "Arquivo não encontrado." : "Erro ao carregar arquivo.",
      });
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension],
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, error.status || 500, { message: error.message || "Erro interno do servidor." });
    } else {
      response.end();
    }
  }
});

server.listen(PORT, () => {
  console.log(`ShakeUp Área 51 disponível em http://localhost:${PORT}`);
  console.log(`Painel administrativo: http://localhost:${PORT}/admin`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
