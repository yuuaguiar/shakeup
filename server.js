// ETAPA 1: Importação dos módulos nativos.
const moduloHttp = require("node:http");
const sistemaArquivos = require("node:fs");
const caminho = require("node:path");
const criptografia = require("node:crypto");
const { URL: EnderecoURL } = require("node:url");
const { DatabaseSync: BancoDadosSincrono } = require("node:sqlite");

// ETAPA 2: Configurações gerais e credenciais do painel.
const PORTA = Number(process.env.PORT) || 3000;
const RAIZ_PROJETO = __dirname;
const CAMINHO_BANCO = caminho.join(RAIZ_PROJETO, "shakeup.db");
const TAMANHO_MAXIMO_CORPO = 1_000_000;
const USUARIO_ADMIN = process.env.ADMIN_USER || "admin";
const SENHA_ADMIN = process.env.ADMIN_PASSWORD || "shakeup51";
const TAXA_ENTREGA = 6;
const sessoes = new Map();

// ETAPA 3: Criação das tabelas e relacionamentos do banco.
const banco = new BancoDadosSincrono(CAMINHO_BANCO);
banco.exec(`
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

  CREATE TABLE IF NOT EXISTS extras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS product_extras (
    product_id INTEGER NOT NULL,
    extra_id INTEGER NOT NULL,
    PRIMARY KEY (product_id, extra_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (extra_id) REFERENCES extras(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS combos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    image TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS combo_products (
    combo_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (combo_id, product_id),
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    fulfillment TEXT NOT NULL CHECK (fulfillment IN ('delivery', 'pickup')),
    delivery_fee REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('product', 'combo')),
    reference_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_item_extras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER NOT NULL,
    extra_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
  );
`);

// Migração simples para projetos que já possuíam a tabela de pedidos.
const colunasPedidos = banco.prepare("PRAGMA table_info(orders)").all().map((coluna) => coluna.name);
if (!colunasPedidos.includes("completed_at")) {
  banco.exec("ALTER TABLE orders ADD COLUMN completed_at TEXT");
}

// ETAPA 4: Dados iniciais para a primeira execução.
const produtosIniciais = [
  ["Órbita de Chocolate", "Milk-shake de chocolate com calda cremosa, brownie e cobertura azul de hortelã.", 18.9, "img/choco-power.jpg", "Chocolate"],
  ["Nebulosa de Morango", "Milk-shake de morango com chantilly, frutas vermelhas e confeitos estelares.", 17.9, "img/morango-dream.jpg", "Frutas"],
  ["Cookies Alien", "Milk-shake de baunilha com cookies crocantes e cobertura verde de limão.", 19.9, "img/cookies-blast.jpg", "Cookies"],
  ["Cometa Caramelo", "Milk-shake de doce de leite com caramelo, chantilly e brilho galáctico.", 18.9, "img/doce-caramelo.jpg", "Caramelo"],
];

const adicionaisIniciais = [
  ["Chantilly", "Extra cremoso", 2.5],
  ["Calda cósmica", "Hortelã azul, limão verde ou caramelo", 2],
  ["Cookies", "Pedaços crocantes", 3],
  ["Brownie", "Pedaços de brownie", 4],
];

function popularBancoInicial() {
  if (banco.prepare("SELECT COUNT(*) AS total FROM products").get().total === 0) {
    const inserir = banco.prepare(`
      INSERT INTO products (name, description, price, image, category, available)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    produtosIniciais.forEach((produto) => inserir.run(...produto));
  }

  if (banco.prepare("SELECT COUNT(*) AS total FROM extras").get().total === 0) {
    const inserir = banco.prepare(`
      INSERT INTO extras (name, description, price, available) VALUES (?, ?, ?, 1)
    `);
    adicionaisIniciais.forEach((adicional) => inserir.run(...adicional));
  }

  if (banco.prepare("SELECT COUNT(*) AS total FROM product_extras").get().total === 0) {
    const produtos = banco.prepare("SELECT id FROM products").all();
    const adicionais = banco.prepare("SELECT id FROM extras").all();
    const vincular = banco.prepare("INSERT OR IGNORE INTO product_extras (product_id, extra_id) VALUES (?, ?)");
    produtos.forEach((produto) => adicionais.forEach((adicional) => vincular.run(produto.id, adicional.id)));
  }

  if (banco.prepare("SELECT COUNT(*) AS total FROM combos").get().total === 0) {
    const inserirCombo = banco.prepare(`
      INSERT INTO combos (name, description, price, image, available) VALUES (?, ?, ?, ?, 1)
    `);
    const comboDuplo = inserirCombo.run(
      "Combo Órbita e Nebulosa",
      "Órbita de Chocolate + Nebulosa de Morango com 2 toppings extras.",
      34.9,
      "img/combo-duplo.png"
    );
    const comboFamilia = inserirCombo.run(
      "Combo Galáxia Completa",
      "Órbita, Nebulosa, Cookies Alien e Cometa Caramelo com caldas especiais.",
      59.9,
      "img/combo-familia.png"
    );
    const produtos = banco.prepare("SELECT id, name FROM products").all();
    const vincular = banco.prepare("INSERT INTO combo_products (combo_id, product_id, quantity) VALUES (?, ?, ?)");
    const orbita = produtos.find((produto) => produto.name === "Órbita de Chocolate");
    const nebulosa = produtos.find((produto) => produto.name === "Nebulosa de Morango");
    if (orbita) vincular.run(comboDuplo.lastInsertRowid, orbita.id, 1);
    if (nebulosa) vincular.run(comboDuplo.lastInsertRowid, nebulosa.id, 1);
    produtos.forEach((produto) => vincular.run(comboFamilia.lastInsertRowid, produto.id, 1));
  }
}

banco.exec("BEGIN");
try {
  popularBancoInicial();
  banco.exec("COMMIT");
} catch (erro) {
  banco.exec("ROLLBACK");
  throw erro;
}

// ETAPA 5: Funções auxiliares de banco e formatação.
function converterDisponibilidade(registro) {
  return registro ? { ...registro, available: Boolean(registro.available) } : null;
}

function buscarAdicionaisProduto(idProduto, somenteDisponiveis = false) {
  const condicao = somenteDisponiveis ? "AND e.available = 1" : "";
  return banco.prepare(`
    SELECT e.* FROM extras e
    INNER JOIN product_extras pe ON pe.extra_id = e.id
    WHERE pe.product_id = ? ${condicao}
    ORDER BY e.name
  `).all(idProduto).map(converterDisponibilidade);
}

function montarProduto(registro, somenteAdicionaisDisponiveis = false) {
  const produto = converterDisponibilidade(registro);
  return produto ? { ...produto, extras: buscarAdicionaisProduto(produto.id, somenteAdicionaisDisponiveis) } : null;
}

function buscarItensCombo(idCombo) {
  return banco.prepare(`
    SELECT p.id, p.name, cp.quantity
    FROM combo_products cp
    INNER JOIN products p ON p.id = cp.product_id
    WHERE cp.combo_id = ? ORDER BY p.name
  `).all(idCombo);
}

function montarCombo(registro) {
  const combo = converterDisponibilidade(registro);
  return combo ? { ...combo, items: buscarItensCombo(combo.id) } : null;
}

function enviarJson(resposta, codigoStatus, dados, cabecalhos = {}) {
  resposta.writeHead(codigoStatus, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    ...cabecalhos,
  });
  resposta.end(JSON.stringify(dados));
}

function lerCorpoJson(requisicao) {
  return new Promise((resolver, rejeitar) => {
    let corpo = "";
    requisicao.on("data", (parte) => {
      corpo += parte;
      if (Buffer.byteLength(corpo) > TAMANHO_MAXIMO_CORPO) {
        const erro = new Error("Corpo da requisição muito grande.");
        erro.status = 413;
        rejeitar(erro);
        requisicao.destroy();
      }
    });
    requisicao.on("end", () => {
      try {
        resolver(corpo ? JSON.parse(corpo) : {});
      } catch {
        const erro = new Error("JSON inválido.");
        erro.status = 400;
        rejeitar(erro);
      }
    });
    requisicao.on("error", rejeitar);
  });
}

function normalizarTelefone(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function obterIdDaRota(nomeRota, recurso) {
  const resultado = nomeRota.match(new RegExp(`^/api/${recurso}/(\\d+)$`));
  return resultado ? Number(resultado[1]) : null;
}

// ETAPA 6: Autenticação simples por sessão para funcionários.
function lerCookies(requisicao) {
  return Object.fromEntries(
    String(requisicao.headers.cookie || "")
      .split(";")
      .map((parte) => parte.trim().split("="))
      .filter(([chave]) => chave)
  );
}

function estaAutenticado(requisicao) {
  const token = lerCookies(requisicao).shakeup_session;
  const sessao = token ? sessoes.get(token) : null;
  if (!sessao || sessao.expiraEm < Date.now()) {
    if (token) sessoes.delete(token);
    return false;
  }
  return true;
}

function exigirAutenticacao(requisicao, resposta) {
  if (estaAutenticado(requisicao)) return true;
  enviarJson(resposta, 401, { message: "Faça login para acessar o painel." });
  return false;
}

async function tratarAutenticacao(requisicao, resposta, endereco) {
  if (endereco.pathname === "/api/auth/login" && requisicao.method === "POST") {
    const dados = await lerCorpoJson(requisicao);
    if (dados.usuario !== USUARIO_ADMIN || dados.senha !== SENHA_ADMIN) {
      enviarJson(resposta, 401, { message: "Usuário ou senha inválidos." });
      return true;
    }
    const token = criptografia.randomBytes(32).toString("hex");
    sessoes.set(token, { expiraEm: Date.now() + 8 * 60 * 60 * 1000 });
    enviarJson(resposta, 200, { authenticated: true }, {
      "Set-Cookie": `shakeup_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
    });
    return true;
  }

  if (endereco.pathname === "/api/auth/session" && requisicao.method === "GET") {
    enviarJson(resposta, 200, { authenticated: estaAutenticado(requisicao) });
    return true;
  }

  if (endereco.pathname === "/api/auth/logout" && requisicao.method === "POST") {
    const token = lerCookies(requisicao).shakeup_session;
    if (token) sessoes.delete(token);
    enviarJson(resposta, 200, { authenticated: false }, {
      "Set-Cookie": "shakeup_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    });
    return true;
  }
  return false;
}

// ETAPA 7: Validação e CRUD de produtos.
function normalizarProduto(dados) {
  const produto = {
    name: String(dados.name || "").trim(),
    description: String(dados.description || "").trim(),
    price: Number(dados.price),
    image: String(dados.image || "").trim(),
    category: String(dados.category || "Milk-shake").trim(),
    available: dados.available === undefined ? true : Boolean(dados.available),
    extraIds: [...new Set((dados.extraIds || []).map(Number).filter(Number.isInteger))],
  };
  const erros = [];
  if (produto.name.length < 3) erros.push("O nome deve ter pelo menos 3 caracteres.");
  if (produto.description.length < 10) erros.push("A descrição deve ter pelo menos 10 caracteres.");
  if (!Number.isFinite(produto.price) || produto.price < 0) erros.push("Informe um preço válido.");
  if (!produto.image) erros.push("Informe o caminho ou URL da imagem.");
  if (!produto.category) erros.push("Informe uma categoria.");
  return { produto, erros };
}

function salvarVinculosAdicionais(idProduto, idsAdicionais) {
  banco.prepare("DELETE FROM product_extras WHERE product_id = ?").run(idProduto);
  const inserir = banco.prepare("INSERT INTO product_extras (product_id, extra_id) VALUES (?, ?)");
  idsAdicionais.forEach((idAdicional) => inserir.run(idProduto, idAdicional));
}

async function tratarProdutos(requisicao, resposta, endereco) {
  const somenteDisponiveis = endereco.searchParams.get("available") === "1";
  const idProduto = obterIdDaRota(endereco.pathname, "products");

  if (endereco.pathname !== "/api/products" && idProduto === null) return false;

  if (endereco.pathname === "/api/products" && requisicao.method === "GET") {
    if (!somenteDisponiveis && !exigirAutenticacao(requisicao, resposta)) return true;
    const linhas = somenteDisponiveis
      ? banco.prepare("SELECT * FROM products WHERE available = 1 ORDER BY id DESC").all()
      : banco.prepare("SELECT * FROM products ORDER BY id DESC").all();
    enviarJson(resposta, 200, linhas.map((linha) => montarProduto(linha, somenteDisponiveis)));
    return true;
  }

  if (idProduto !== null && requisicao.method === "GET") {
    const linha = banco.prepare("SELECT * FROM products WHERE id = ?").get(idProduto);
    if (!linha) enviarJson(resposta, 404, { message: "Produto não encontrado." });
    else enviarJson(resposta, 200, montarProduto(linha));
    return true;
  }

  if (!["POST", "PUT", "DELETE"].includes(requisicao.method)) return false;
  if (!exigirAutenticacao(requisicao, resposta)) return true;

  if (endereco.pathname === "/api/products" && requisicao.method === "POST") {
    const { produto, erros } = normalizarProduto(await lerCorpoJson(requisicao));
    if (erros.length) {
      enviarJson(resposta, 422, { message: "Revise os dados do produto.", errors: erros });
      return true;
    }
    banco.exec("BEGIN");
    try {
      const resultado = banco.prepare(`
        INSERT INTO products (name, description, price, image, category, available) VALUES (?, ?, ?, ?, ?, ?)
      `).run(produto.name, produto.description, produto.price, produto.image, produto.category, Number(produto.available));
      salvarVinculosAdicionais(Number(resultado.lastInsertRowid), produto.extraIds);
      banco.exec("COMMIT");
      enviarJson(resposta, 201, montarProduto(banco.prepare("SELECT * FROM products WHERE id = ?").get(resultado.lastInsertRowid)));
    } catch (erro) {
      banco.exec("ROLLBACK");
      throw erro;
    }
    return true;
  }

  if (idProduto !== null && requisicao.method === "PUT") {
    const { produto, erros } = normalizarProduto(await lerCorpoJson(requisicao));
    if (erros.length) {
      enviarJson(resposta, 422, { message: "Revise os dados do produto.", errors: erros });
      return true;
    }
    banco.exec("BEGIN");
    try {
      const resultado = banco.prepare(`
        UPDATE products SET name=?, description=?, price=?, image=?, category=?, available=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).run(produto.name, produto.description, produto.price, produto.image, produto.category, Number(produto.available), idProduto);
      if (!resultado.changes) {
        banco.exec("ROLLBACK");
        enviarJson(resposta, 404, { message: "Produto não encontrado." });
        return true;
      }
      salvarVinculosAdicionais(idProduto, produto.extraIds);
      banco.exec("COMMIT");
      enviarJson(resposta, 200, montarProduto(banco.prepare("SELECT * FROM products WHERE id = ?").get(idProduto)));
    } catch (erro) {
      banco.exec("ROLLBACK");
      throw erro;
    }
    return true;
  }

  if (idProduto !== null && requisicao.method === "DELETE") {
    const resultado = banco.prepare("DELETE FROM products WHERE id = ?").run(idProduto);
    if (!resultado.changes) enviarJson(resposta, 404, { message: "Produto não encontrado." });
    else { resposta.writeHead(204); resposta.end(); }
    return true;
  }
  return false;
}

// ETAPA 8: Adicionais disponíveis para associação no painel.
function tratarAdicionais(requisicao, resposta, endereco) {
  if (endereco.pathname !== "/api/extras" || requisicao.method !== "GET") return false;
  if (!exigirAutenticacao(requisicao, resposta)) return true;
  const adicionais = banco.prepare("SELECT * FROM extras ORDER BY name").all().map(converterDisponibilidade);
  enviarJson(resposta, 200, adicionais);
  return true;
}

// ETAPA 9: CRUD de combos e sua composição.
function normalizarCombo(dados) {
  const combo = {
    name: String(dados.name || "").trim(),
    description: String(dados.description || "").trim(),
    price: Number(dados.price),
    image: String(dados.image || "").trim(),
    available: dados.available === undefined ? true : Boolean(dados.available),
    items: (dados.items || []).map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity || 1) }))
      .filter((item) => Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0),
  };
  const erros = [];
  if (combo.name.length < 3) erros.push("Informe o nome do combo.");
  if (combo.description.length < 10) erros.push("Informe a descrição do combo.");
  if (!Number.isFinite(combo.price) || combo.price < 0) erros.push("Informe um preço válido.");
  if (!combo.image) erros.push("Informe a imagem do combo.");
  if (!combo.items.length) erros.push("Selecione pelo menos um produto para o combo.");
  return { combo, erros };
}

function salvarItensCombo(idCombo, itens) {
  banco.prepare("DELETE FROM combo_products WHERE combo_id = ?").run(idCombo);
  const inserir = banco.prepare("INSERT INTO combo_products (combo_id, product_id, quantity) VALUES (?, ?, ?)");
  itens.forEach((item) => inserir.run(idCombo, item.productId, item.quantity));
}

async function tratarCombos(requisicao, resposta, endereco) {
  const somenteDisponiveis = endereco.searchParams.get("available") === "1";
  const idCombo = obterIdDaRota(endereco.pathname, "combos");

  if (endereco.pathname !== "/api/combos" && idCombo === null) return false;

  if (endereco.pathname === "/api/combos" && requisicao.method === "GET") {
    if (!somenteDisponiveis && !exigirAutenticacao(requisicao, resposta)) return true;
    const linhas = somenteDisponiveis
      ? banco.prepare("SELECT * FROM combos WHERE available=1 ORDER BY id DESC").all()
      : banco.prepare("SELECT * FROM combos ORDER BY id DESC").all();
    enviarJson(resposta, 200, linhas.map(montarCombo));
    return true;
  }

  if (!["POST", "PUT", "DELETE"].includes(requisicao.method)) return false;
  if (!exigirAutenticacao(requisicao, resposta)) return true;

  if (endereco.pathname === "/api/combos" && requisicao.method === "POST") {
    const { combo, erros } = normalizarCombo(await lerCorpoJson(requisicao));
    if (erros.length) { enviarJson(resposta, 422, { message: "Revise os dados do combo.", errors: erros }); return true; }
    banco.exec("BEGIN");
    try {
      const resultado = banco.prepare(`INSERT INTO combos (name,description,price,image,available) VALUES (?,?,?,?,?)`)
        .run(combo.name, combo.description, combo.price, combo.image, Number(combo.available));
      salvarItensCombo(Number(resultado.lastInsertRowid), combo.items);
      banco.exec("COMMIT");
      enviarJson(resposta, 201, montarCombo(banco.prepare("SELECT * FROM combos WHERE id=?").get(resultado.lastInsertRowid)));
    } catch (erro) { banco.exec("ROLLBACK"); throw erro; }
    return true;
  }

  if (idCombo !== null && requisicao.method === "PUT") {
    const { combo, erros } = normalizarCombo(await lerCorpoJson(requisicao));
    if (erros.length) { enviarJson(resposta, 422, { message: "Revise os dados do combo.", errors: erros }); return true; }
    banco.exec("BEGIN");
    try {
      const resultado = banco.prepare(`UPDATE combos SET name=?,description=?,price=?,image=?,available=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(combo.name, combo.description, combo.price, combo.image, Number(combo.available), idCombo);
      if (!resultado.changes) { banco.exec("ROLLBACK"); enviarJson(resposta, 404, { message: "Combo não encontrado." }); return true; }
      salvarItensCombo(idCombo, combo.items);
      banco.exec("COMMIT");
      enviarJson(resposta, 200, montarCombo(banco.prepare("SELECT * FROM combos WHERE id=?").get(idCombo)));
    } catch (erro) { banco.exec("ROLLBACK"); throw erro; }
    return true;
  }

  if (idCombo !== null && requisicao.method === "DELETE") {
    const resultado = banco.prepare("DELETE FROM combos WHERE id=?").run(idCombo);
    if (!resultado.changes) enviarJson(resposta, 404, { message: "Combo não encontrado." });
    else { resposta.writeHead(204); resposta.end(); }
    return true;
  }
  return false;
}

// ETAPA 10: Clientes identificados pelo número de telefone.
function tratarClientes(requisicao, resposta, endereco) {
  const resultado = endereco.pathname.match(/^\/api\/customers\/phone\/(.+)$/);
  if (!resultado || requisicao.method !== "GET") return false;
  const telefone = normalizarTelefone(decodeURIComponent(resultado[1]));
  if (telefone.length < 10) { enviarJson(resposta, 422, { message: "Informe um telefone válido." }); return true; }
  const cliente = banco.prepare("SELECT id, phone, name, address FROM customers WHERE phone=?").get(telefone);
  enviarJson(resposta, 200, { found: Boolean(cliente), customer: cliente || null });
  return true;
}

// ETAPA 11: Criação do pedido com recálculo de preços no servidor.
async function tratarPedidos(requisicao, resposta, endereco) {
  if (endereco.pathname === "/api/orders" && requisicao.method === "GET") {
    if (!exigirAutenticacao(requisicao, resposta)) return true;
    const pedidos = banco.prepare(`
      SELECT o.*, c.name AS customer_name, c.phone, c.address
      FROM orders o INNER JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC
    `).all().map((pedido) => ({
      ...pedido,
      items: banco.prepare("SELECT * FROM order_items WHERE order_id=? ORDER BY id").all(pedido.id).map((item) => ({
        ...item,
        extras: banco.prepare("SELECT * FROM order_item_extras WHERE order_item_id=?").all(item.id),
      })),
    }));
    enviarJson(resposta, 200, pedidos);
    return true;
  }

  const resultadoStatus = endereco.pathname.match(/^\/api\/orders\/(\d+)\/status$/);
  if (resultadoStatus && requisicao.method === "PUT") {
    if (!exigirAutenticacao(requisicao, resposta)) return true;
    const idPedido = Number(resultadoStatus[1]);
    const dados = await lerCorpoJson(requisicao);
    const status = dados.status === "completed" ? "completed" : "received";
    const concluidoEm = status === "completed" ? new Date().toISOString() : null;
    const resultado = banco.prepare("UPDATE orders SET status=?, completed_at=? WHERE id=?")
      .run(status, concluidoEm, idPedido);
    if (!resultado.changes) enviarJson(resposta, 404, { message: "Pedido não encontrado." });
    else enviarJson(resposta, 200, banco.prepare("SELECT * FROM orders WHERE id=?").get(idPedido));
    return true;
  }

  if (endereco.pathname !== "/api/orders" || requisicao.method !== "POST") return false;
  const dados = await lerCorpoJson(requisicao);
  const telefone = normalizarTelefone(dados.phone);
  const nome = String(dados.name || "").trim();
  const enderecoCliente = String(dados.address || "").trim();
  const modalidade = dados.fulfillment === "pickup" ? "pickup" : "delivery";
  const itensRecebidos = Array.isArray(dados.items) ? dados.items : [];

  if (telefone.length < 10 || nome.length < 3) {
    enviarJson(resposta, 422, { message: "Informe telefone e nome válidos." }); return true;
  }
  if (modalidade === "delivery" && enderecoCliente.length < 8) {
    enviarJson(resposta, 422, { message: "Informe o endereço para entrega." }); return true;
  }
  if (!itensRecebidos.length) {
    enviarJson(resposta, 422, { message: "O pedido não possui itens." }); return true;
  }

  banco.exec("BEGIN");
  try {
    let cliente = banco.prepare("SELECT * FROM customers WHERE phone=?").get(telefone);
    if (cliente) {
      banco.prepare("UPDATE customers SET name=?, address=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .run(nome, enderecoCliente || cliente.address, cliente.id);
      cliente = banco.prepare("SELECT * FROM customers WHERE id=?").get(cliente.id);
    } else {
      const resultadoCliente = banco.prepare("INSERT INTO customers (phone,name,address) VALUES (?,?,?)")
        .run(telefone, nome, enderecoCliente);
      cliente = banco.prepare("SELECT * FROM customers WHERE id=?").get(resultadoCliente.lastInsertRowid);
    }

    let subtotal = 0;
    const itensCalculados = itensRecebidos.map((itemRecebido) => {
      const tipo = itemRecebido.type === "combo" ? "combo" : "product";
      const idReferencia = Number(itemRecebido.id);
      const quantidade = Math.max(1, Number(itemRecebido.quantity) || 1);
      const tabela = tipo === "combo" ? "combos" : "products";
      const registro = banco.prepare(`SELECT * FROM ${tabela} WHERE id=? AND available=1`).get(idReferencia);
      if (!registro) throw Object.assign(new Error("Um item do pedido não está disponível."), { status: 422 });

      const adicionais = [];
      if (tipo === "product") {
        const idsPermitidos = new Set(buscarAdicionaisProduto(idReferencia, true).map((adicional) => adicional.id));
        [...new Set((itemRecebido.extraIds || []).map(Number))].forEach((idAdicional) => {
          if (!idsPermitidos.has(idAdicional)) return;
          const adicional = banco.prepare("SELECT * FROM extras WHERE id=? AND available=1").get(idAdicional);
          if (adicional) adicionais.push(adicional);
        });
      }

      const precoAdicionais = adicionais.reduce((soma, adicional) => soma + adicional.price, 0);
      subtotal += (registro.price + precoAdicionais) * quantidade;
      return { tipo, registro, quantidade, adicionais };
    });

    const taxaEntrega = modalidade === "delivery" ? TAXA_ENTREGA : 0;
    const total = subtotal + taxaEntrega;
    const resultadoPedido = banco.prepare(`
      INSERT INTO orders (customer_id,fulfillment,delivery_fee,total) VALUES (?,?,?,?)
    `).run(cliente.id, modalidade, taxaEntrega, total);
    const idPedido = Number(resultadoPedido.lastInsertRowid);
    const inserirItem = banco.prepare(`
      INSERT INTO order_items (order_id,item_type,reference_id,name,quantity,unit_price) VALUES (?,?,?,?,?,?)
    `);
    const inserirAdicional = banco.prepare(`
      INSERT INTO order_item_extras (order_item_id,extra_id,name,price) VALUES (?,?,?,?)
    `);
    itensCalculados.forEach((item) => {
      const resultadoItem = inserirItem.run(idPedido, item.tipo, item.registro.id, item.registro.name, item.quantidade, item.registro.price);
      item.adicionais.forEach((adicional) => inserirAdicional.run(resultadoItem.lastInsertRowid, adicional.id, adicional.name, adicional.price));
    });
    banco.exec("COMMIT");
    enviarJson(resposta, 201, { id: idPedido, subtotal, deliveryFee: taxaEntrega, total, fulfillment: modalidade, estimatedMin: 10, estimatedMax: 25 });
  } catch (erro) {
    banco.exec("ROLLBACK");
    throw erro;
  }
  return true;
}

// ETAPA 12: Roteamento central da API.
async function tratarApi(requisicao, resposta, endereco) {
  if (requisicao.method === "OPTIONS") {
    resposta.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    resposta.end(); return;
  }

  if (await tratarAutenticacao(requisicao, resposta, endereco)) return;
  if (await tratarProdutos(requisicao, resposta, endereco)) return;
  if (tratarAdicionais(requisicao, resposta, endereco)) return;
  if (await tratarCombos(requisicao, resposta, endereco)) return;
  if (tratarClientes(requisicao, resposta, endereco)) return;
  if (await tratarPedidos(requisicao, resposta, endereco)) return;
  enviarJson(resposta, 404, { message: "Rota da API não encontrada." });
}

// ETAPA 13: Servidor de arquivos estáticos.
const tiposMime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

function servirArquivoEstatico(resposta, nomeRota) {
  const rota = nomeRota === "/" ? "/index.html" : nomeRota === "/admin" ? "/admin.html" : nomeRota;
  const caminhoArquivo = caminho.resolve(RAIZ_PROJETO, `.${decodeURIComponent(rota)}`);
  const extensao = caminho.extname(caminhoArquivo).toLowerCase();
  if (!caminhoArquivo.startsWith(`${RAIZ_PROJETO}${caminho.sep}`) || !tiposMime[extensao]) {
    enviarJson(resposta, 404, { message: "Arquivo não encontrado." }); return;
  }
  sistemaArquivos.readFile(caminhoArquivo, (erro, conteudo) => {
    if (erro) { enviarJson(resposta, erro.code === "ENOENT" ? 404 : 500, { message: "Arquivo não encontrado." }); return; }
    const arquivoInterface = [".html", ".css", ".js"].includes(extensao);
    resposta.writeHead(200, { "Content-Type": tiposMime[extensao], "Cache-Control": arquivoInterface ? "no-cache" : "public, max-age=3600" });
    resposta.end(conteudo);
  });
}

// ETAPA 14: Inicialização e encerramento seguro.
const servidor = moduloHttp.createServer(async (requisicao, resposta) => {
  const endereco = new EnderecoURL(requisicao.url, `http://${requisicao.headers.host || "localhost"}`);
  try {
    if (endereco.pathname.startsWith("/api/")) await tratarApi(requisicao, resposta, endereco);
    else servirArquivoEstatico(resposta, endereco.pathname);
  } catch (erro) {
    console.error(erro);
    if (!resposta.headersSent) enviarJson(resposta, erro.status || 500, { message: erro.message || "Erro interno do servidor." });
    else resposta.end();
  }
});

servidor.listen(PORTA, () => {
  console.log(`ShakeUp Área 51 disponível em http://localhost:${PORTA}`);
  console.log(`Painel administrativo: http://localhost:${PORTA}/admin`);
});

function encerrarAplicacao() {
  servidor.close(() => { banco.close(); process.exit(0); });
}
process.on("SIGINT", encerrarAplicacao);
process.on("SIGTERM", encerrarAplicacao);
