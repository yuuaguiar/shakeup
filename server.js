// ETAPA 1: Importação dos módulos nativos utilizados pelo servidor.
const moduloHttp = require("node:http");
const sistemaArquivos = require("node:fs");
const caminho = require("node:path");
const { URL: EnderecoURL } = require("node:url");
const { DatabaseSync: BancoDadosSincrono } = require("node:sqlite");

// ETAPA 2: Configurações gerais da aplicação.
const PORTA = Number(process.env.PORT) || 3000;
const RAIZ_PROJETO = __dirname;
const CAMINHO_BANCO = caminho.join(RAIZ_PROJETO, "shakeup.db");
const TAMANHO_MAXIMO_CORPO = 1_000_000;

// ETAPA 3: Abertura do SQLite e criação da tabela caso ela ainda não exista.
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
`);

// ETAPA 4: Produtos iniciais inseridos somente quando o banco está vazio.
const produtosIniciais = [
  {
    nome: "Órbita de Chocolate",
    descricao: "Milk-shake de chocolate com calda cremosa, brownie e cobertura azul de hortelã.",
    preco: 18.9,
    imagem: "img/choco-power.jpg",
    categoria: "Chocolate",
  },
  {
    nome: "Nebulosa de Morango",
    descricao: "Milk-shake de morango com chantilly, frutas vermelhas e confeitos estelares.",
    preco: 17.9,
    imagem: "img/morango-dream.jpg",
    categoria: "Frutas",
  },
  {
    nome: "Cookies Alien",
    descricao: "Milk-shake de baunilha com cookies crocantes e cobertura verde de limão.",
    preco: 19.9,
    imagem: "img/cookies-blast.jpg",
    categoria: "Cookies",
  },
  {
    nome: "Cometa Caramelo",
    descricao: "Milk-shake de doce de leite com caramelo, chantilly e brilho galáctico.",
    preco: 18.9,
    imagem: "img/doce-caramelo.jpg",
    categoria: "Caramelo",
  },
];

const totalProdutos = banco.prepare("SELECT COUNT(*) AS total FROM products").get().total;

if (totalProdutos === 0) {
  const inserirProdutoInicial = banco.prepare(`
    INSERT INTO products (name, description, price, image, category, available)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  // A transação garante que todos os produtos sejam inseridos juntos.
  banco.exec("BEGIN");
  try {
    produtosIniciais.forEach((produto) => {
      inserirProdutoInicial.run(
        produto.nome,
        produto.descricao,
        produto.preco,
        produto.imagem,
        produto.categoria
      );
    });
    banco.exec("COMMIT");
  } catch (erro) {
    banco.exec("ROLLBACK");
    throw erro;
  }
}

// ETAPA 5: Funções auxiliares de resposta, leitura e validação.
function converterLinhaEmProduto(linha) {
  return linha ? { ...linha, available: Boolean(linha.available) } : null;
}

function enviarJson(resposta, codigoStatus, dados) {
  resposta.writeHead(codigoStatus, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
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

function normalizarProduto(dadosRecebidos) {
  // A API usa nomes em inglês no JSON para manter compatibilidade com o banco.
  const produto = {
    name: String(dadosRecebidos.name || "").trim(),
    description: String(dadosRecebidos.description || "").trim(),
    price: Number(dadosRecebidos.price),
    image: String(dadosRecebidos.image || "").trim(),
    category: String(dadosRecebidos.category || "Milk-shake").trim(),
    available: dadosRecebidos.available === undefined ? true : Boolean(dadosRecebidos.available),
  };

  const erros = [];
  if (produto.name.length < 3) erros.push("O nome deve ter pelo menos 3 caracteres.");
  if (produto.description.length < 10) erros.push("A descrição deve ter pelo menos 10 caracteres.");
  if (!Number.isFinite(produto.price) || produto.price < 0) erros.push("Informe um preço válido.");
  if (!produto.image) erros.push("Informe o caminho ou URL da imagem.");
  if (!produto.category) erros.push("Informe uma categoria.");

  return { produto, erros };
}

function obterIdDaRota(nomeRota) {
  const resultado = nomeRota.match(/^\/api\/products\/(\d+)$/);
  return resultado ? Number(resultado[1]) : null;
}

// ETAPA 6: Tratamento das rotas da API REST.
async function tratarApi(requisicao, resposta, endereco) {
  // OPTIONS permite que navegadores consultem os métodos aceitos pela API.
  if (requisicao.method === "OPTIONS") {
    resposta.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    resposta.end();
    return;
  }

  // READ: lista todos os produtos ou somente os disponíveis.
  if (endereco.pathname === "/api/products" && requisicao.method === "GET") {
    const somenteDisponiveis = endereco.searchParams.get("available") === "1";
    const linhas = somenteDisponiveis
      ? banco.prepare("SELECT * FROM products WHERE available = 1 ORDER BY id DESC").all()
      : banco.prepare("SELECT * FROM products ORDER BY id DESC").all();

    enviarJson(resposta, 200, linhas.map(converterLinhaEmProduto));
    return;
  }

  // CREATE: valida e cadastra um novo produto.
  if (endereco.pathname === "/api/products" && requisicao.method === "POST") {
    const { produto, erros } = normalizarProduto(await lerCorpoJson(requisicao));
    if (erros.length) {
      enviarJson(resposta, 422, { message: "Revise os dados do produto.", errors: erros });
      return;
    }

    const resultado = banco.prepare(`
      INSERT INTO products (name, description, price, image, category, available)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      produto.name,
      produto.description,
      produto.price,
      produto.image,
      produto.category,
      Number(produto.available)
    );

    const produtoCriado = banco
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(resultado.lastInsertRowid);

    enviarJson(resposta, 201, converterLinhaEmProduto(produtoCriado));
    return;
  }

  const idProduto = obterIdDaRota(endereco.pathname);

  // READ por ID: seleciona apenas um produto.
  if (idProduto !== null && requisicao.method === "GET") {
    const produto = banco.prepare("SELECT * FROM products WHERE id = ?").get(idProduto);
    if (!produto) {
      enviarJson(resposta, 404, { message: "Produto não encontrado." });
      return;
    }
    enviarJson(resposta, 200, converterLinhaEmProduto(produto));
    return;
  }

  // UPDATE: substitui os dados do produto informado.
  if (idProduto !== null && requisicao.method === "PUT") {
    const produtoExiste = banco.prepare("SELECT id FROM products WHERE id = ?").get(idProduto);
    if (!produtoExiste) {
      enviarJson(resposta, 404, { message: "Produto não encontrado." });
      return;
    }

    const { produto, erros } = normalizarProduto(await lerCorpoJson(requisicao));
    if (erros.length) {
      enviarJson(resposta, 422, { message: "Revise os dados do produto.", errors: erros });
      return;
    }

    banco.prepare(`
      UPDATE products
      SET name = ?, description = ?, price = ?, image = ?, category = ?,
          available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      produto.name,
      produto.description,
      produto.price,
      produto.image,
      produto.category,
      Number(produto.available),
      idProduto
    );

    const produtoAtualizado = banco.prepare("SELECT * FROM products WHERE id = ?").get(idProduto);
    enviarJson(resposta, 200, converterLinhaEmProduto(produtoAtualizado));
    return;
  }

  // DELETE: remove definitivamente um produto.
  if (idProduto !== null && requisicao.method === "DELETE") {
    const resultado = banco.prepare("DELETE FROM products WHERE id = ?").run(idProduto);
    if (resultado.changes === 0) {
      enviarJson(resposta, 404, { message: "Produto não encontrado." });
      return;
    }
    resposta.writeHead(204, { "Access-Control-Allow-Origin": "*" });
    resposta.end();
    return;
  }

  enviarJson(resposta, 404, { message: "Rota da API não encontrada." });
}

// ETAPA 7: Tipos de arquivos que podem ser enviados ao navegador.
const tiposMime = {
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

function servirArquivoEstatico(resposta, nomeRota) {
  const rotaSolicitada = nomeRota === "/"
    ? "/index.html"
    : nomeRota === "/admin"
      ? "/admin.html"
      : nomeRota;

  const caminhoArquivo = caminho.resolve(RAIZ_PROJETO, `.${decodeURIComponent(rotaSolicitada)}`);
  const extensao = caminho.extname(caminhoArquivo).toLowerCase();

  // Esta verificação impede acesso a arquivos fora da pasta do projeto.
  if (!caminhoArquivo.startsWith(`${RAIZ_PROJETO}${caminho.sep}`) || !tiposMime[extensao]) {
    enviarJson(resposta, 404, { message: "Arquivo não encontrado." });
    return;
  }

  sistemaArquivos.readFile(caminhoArquivo, (erro, conteudo) => {
    if (erro) {
      enviarJson(resposta, erro.code === "ENOENT" ? 404 : 500, {
        message: erro.code === "ENOENT" ? "Arquivo não encontrado." : "Erro ao carregar arquivo.",
      });
      return;
    }

    const arquivoDaInterface = [".html", ".css", ".js"].includes(extensao);

    resposta.writeHead(200, {
      "Content-Type": tiposMime[extensao],
      "Cache-Control": arquivoDaInterface ? "no-cache" : "public, max-age=3600",
    });
    resposta.end(conteudo);
  });
}

// ETAPA 8: Criação e inicialização do servidor HTTP.
const servidor = moduloHttp.createServer(async (requisicao, resposta) => {
  const endereco = new EnderecoURL(requisicao.url, `http://${requisicao.headers.host || "localhost"}`);

  try {
    if (endereco.pathname.startsWith("/api/")) {
      await tratarApi(requisicao, resposta, endereco);
      return;
    }
    servirArquivoEstatico(resposta, endereco.pathname);
  } catch (erro) {
    console.error(erro);
    if (!resposta.headersSent) {
      enviarJson(resposta, erro.status || 500, {
        message: erro.message || "Erro interno do servidor.",
      });
    } else {
      resposta.end();
    }
  }
});

servidor.listen(PORTA, () => {
  console.log(`ShakeUp Área 51 disponível em http://localhost:${PORTA}`);
  console.log(`Painel administrativo: http://localhost:${PORTA}/admin`);
});

// ETAPA 9: Encerramento seguro do servidor e do banco.
function encerrarAplicacao() {
  servidor.close(() => {
    banco.close();
    process.exit(0);
  });
}

process.on("SIGINT", encerrarAplicacao);
process.on("SIGTERM", encerrarAplicacao);
