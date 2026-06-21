// ETAPA 1: Configurações e elementos principais.
const URL_API = "/api";
const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const elementos = {
  telaLogin: document.querySelector("#login-screen"), aplicativo: document.querySelector("#admin-app"),
  formularioLogin: document.querySelector("#login-form"), usuario: document.querySelector("#login-user"),
  senha: document.querySelector("#login-password"), mensagemLogin: document.querySelector("#login-message"),
  botaoSair: document.querySelector("#logout-button"), abas: document.querySelectorAll(".admin-tab"),
  visualizacoes: document.querySelectorAll(".tab-view"), aviso: document.querySelector("#toast"),
  totalProdutos: document.querySelector("#stat-products"), totalCombos: document.querySelector("#stat-combos"),
  totalPedidos: document.querySelector("#stat-orders"), formularioProduto: document.querySelector("#product-form"),
  idProduto: document.querySelector("#product-id"), nomeProduto: document.querySelector("#product-name"),
  categoriaProduto: document.querySelector("#product-category"), precoProduto: document.querySelector("#product-price"),
  descricaoProduto: document.querySelector("#product-description"), imagemProduto: document.querySelector("#product-image"),
  disponivelProduto: document.querySelector("#product-available"), previaProduto: document.querySelector("#product-preview"),
  adicionaisProduto: document.querySelector("#product-extras"), tituloProduto: document.querySelector("#product-form-title"),
  rotuloProduto: document.querySelector("#product-form-kicker"), enviarProduto: document.querySelector("#submit-product"),
  cancelarProduto: document.querySelector("#cancel-product"), buscaProduto: document.querySelector("#product-search"),
  listaProdutos: document.querySelector("#admin-product-list"), formularioCombo: document.querySelector("#combo-form"),
  idCombo: document.querySelector("#combo-id"), nomeCombo: document.querySelector("#combo-name"),
  precoCombo: document.querySelector("#combo-price"), descricaoCombo: document.querySelector("#combo-description"),
  imagemCombo: document.querySelector("#combo-image"), disponivelCombo: document.querySelector("#combo-available"),
  previaCombo: document.querySelector("#combo-preview"), produtosCombo: document.querySelector("#combo-products"),
  tituloCombo: document.querySelector("#combo-form-title"), rotuloCombo: document.querySelector("#combo-form-kicker"),
  enviarCombo: document.querySelector("#submit-combo"), cancelarCombo: document.querySelector("#cancel-combo"),
  listaCombos: document.querySelector("#admin-combo-list"), listaPedidos: document.querySelector("#admin-order-list"),
  atualizarPedidos: document.querySelector("#refresh-orders"), dialogoExclusao: document.querySelector("#delete-dialog"),
  tituloExclusao: document.querySelector("#delete-title"), mensagemExclusao: document.querySelector("#delete-message"),
};

let produtos = [];
let adicionais = [];
let combos = [];
let pedidos = [];
let exclusaoPendente = null;
let temporizadorAviso = null;

// ETAPA 2: Comunicação centralizada com a API.
async function requisitarApi(endereco, opcoes = {}) {
  const resposta = await fetch(endereco, {
    ...opcoes,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...opcoes.headers },
  });
  const dados = resposta.status === 204 ? null : await resposta.json();
  if (!resposta.ok) {
    if (resposta.status === 401 && !endereco.includes("/auth/login")) exibirLogin();
    throw new Error(dados?.errors?.join(" ") || dados?.message || "Não foi possível concluir a operação.");
  }
  return dados;
}

function criarElemento(nomeTag, classe, texto) {
  const elemento = document.createElement(nomeTag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function mostrarAviso(mensagem, tipo = "sucesso") {
  window.clearTimeout(temporizadorAviso);
  elementos.aviso.textContent = mensagem;
  elementos.aviso.classList.toggle("error", tipo === "erro");
  elementos.aviso.classList.add("show");
  temporizadorAviso = window.setTimeout(() => elementos.aviso.classList.remove("show"), 3200);
}

// ETAPA 3: Login, sessão e saída do painel.
function exibirLogin() {
  elementos.telaLogin.classList.remove("hidden");
  elementos.aplicativo.classList.add("hidden");
}

async function exibirPainel() {
  elementos.telaLogin.classList.add("hidden");
  elementos.aplicativo.classList.remove("hidden");
  await carregarTudo();
}

async function verificarSessao() {
  try {
    const sessao = await requisitarApi(`${URL_API}/auth/session`);
    if (sessao.authenticated) await exibirPainel();
    else exibirLogin();
  } catch {
    exibirLogin();
  }
}

elementos.formularioLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  elementos.mensagemLogin.textContent = "";
  try {
    await requisitarApi(`${URL_API}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ usuario: elementos.usuario.value, senha: elementos.senha.value }),
    });
    elementos.formularioLogin.reset();
    await exibirPainel();
  } catch (erro) {
    elementos.mensagemLogin.textContent = erro.message;
  }
});

elementos.botaoSair.addEventListener("click", async () => {
  await requisitarApi(`${URL_API}/auth/logout`, { method: "POST" });
  exibirLogin();
});

// ETAPA 4: Navegação entre produtos, combos e pedidos.
elementos.abas.forEach((aba) => {
  aba.addEventListener("click", () => {
    elementos.abas.forEach((item) => item.classList.toggle("active", item === aba));
    elementos.visualizacoes.forEach((visualizacao) => {
      visualizacao.classList.toggle("hidden", visualizacao.id !== `${aba.dataset.tab}-view`);
    });
  });
});

function atualizarIndicadores() {
  elementos.totalProdutos.textContent = produtos.length;
  elementos.totalCombos.textContent = combos.length;
  elementos.totalPedidos.textContent = pedidos.length;
}

// ETAPA 5: Renderização dos vínculos de adicionais e composição de combos.
function renderizarAdicionaisProduto(idsSelecionados = []) {
  const selecionados = new Set(idsSelecionados.map(Number));
  elementos.adicionaisProduto.replaceChildren();
  adicionais.forEach((adicional) => {
    const rotulo = criarElemento("label", "relation-option");
    const caixa = document.createElement("input");
    caixa.type = "checkbox"; caixa.value = adicional.id; caixa.checked = selecionados.has(adicional.id);
    const texto = document.createElement("span");
    texto.append(criarElemento("strong", "", adicional.name));
    texto.append(criarElemento("small", "", `${adicional.description} · ${formatadorMoeda.format(adicional.price)}`));
    rotulo.append(caixa, texto);
    elementos.adicionaisProduto.append(rotulo);
  });
}

function renderizarProdutosCombo(itensSelecionados = []) {
  const quantidades = new Map(itensSelecionados.map((item) => [Number(item.id || item.productId), Number(item.quantity || 1)]));
  elementos.produtosCombo.replaceChildren();
  produtos.forEach((produto) => {
    const rotulo = criarElemento("label", "relation-option");
    const caixa = document.createElement("input"); caixa.type = "checkbox"; caixa.value = produto.id; caixa.checked = quantidades.has(produto.id);
    const texto = document.createElement("span"); texto.append(criarElemento("strong", "", produto.name)); texto.append(criarElemento("small", "", formatadorMoeda.format(produto.price)));
    const quantidade = document.createElement("input"); quantidade.type = "number"; quantidade.min = "1"; quantidade.value = quantidades.get(produto.id) || 1; quantidade.disabled = !caixa.checked;
    caixa.addEventListener("change", () => { quantidade.disabled = !caixa.checked; });
    rotulo.append(caixa, texto, quantidade);
    elementos.produtosCombo.append(rotulo);
  });
}

// ETAPA 6: Listas administrativas.
function criarLinhaAdministrativa(item, recurso) {
  const linha = criarElemento("article", "admin-product-row");
  const imagem = document.createElement("img"); imagem.src = item.image; imagem.alt = `Foto de ${item.name}`;
  const conteudo = criarElemento("div", "product-main"); conteudo.append(criarElemento("h3", "", item.name)); conteudo.append(criarElemento("p", "", item.description));
  const metadados = criarElemento("div", "product-meta"); metadados.append(criarElemento("strong", "", formatadorMoeda.format(item.price)));
  if (recurso === "product") metadados.append(criarElemento("span", "", `${item.extras.length} adicionais vinculados`));
  else metadados.append(criarElemento("span", "", `${item.items.length} produtos no combo`));
  metadados.append(criarElemento("span", `status-badge${item.available ? "" : " off"}`, item.available ? "Disponível" : "Indisponível")); conteudo.append(metadados);
  const acoes = criarElemento("div", "row-actions");
  [
    ["Editar", "edit", "row-action"], ["Excluir", "delete", "row-action danger"],
  ].forEach(([texto, acao, classe]) => { const botao = criarElemento("button", classe, texto); botao.type = "button"; botao.dataset.action = acao; botao.dataset.resource = recurso; botao.dataset.id = item.id; acoes.append(botao); });
  linha.append(imagem, conteudo, acoes); return linha;
}

function renderizarProdutos() {
  const termo = elementos.buscaProduto.value.trim().toLocaleLowerCase("pt-BR");
  const filtrados = produtos.filter((produto) => `${produto.name} ${produto.category}`.toLocaleLowerCase("pt-BR").includes(termo));
  elementos.listaProdutos.replaceChildren();
  if (!filtrados.length) elementos.listaProdutos.append(criarElemento("p", "empty-state", "Nenhum produto encontrado."));
  else filtrados.forEach((produto) => elementos.listaProdutos.append(criarLinhaAdministrativa(produto, "product")));
}

function renderizarCombos() {
  elementos.listaCombos.replaceChildren();
  if (!combos.length) elementos.listaCombos.append(criarElemento("p", "empty-state", "Nenhum combo cadastrado."));
  else combos.forEach((combo) => elementos.listaCombos.append(criarLinhaAdministrativa(combo, "combo")));
}

function renderizarPedidos() {
  elementos.listaPedidos.replaceChildren();
  if (!pedidos.length) { elementos.listaPedidos.append(criarElemento("p", "empty-state", "Nenhum pedido recebido.")); return; }
  pedidos.forEach((pedido) => {
    const linha = criarElemento("article", "order-row");
    const cliente = criarElemento("div", "order-customer"); cliente.append(criarElemento("strong", "", pedido.customer_name)); cliente.append(criarElemento("span", "", pedido.phone)); cliente.append(criarElemento("span", "", pedido.fulfillment === "delivery" ? pedido.address : "Retirada no local"));
    const itens = criarElemento("div", "order-items"); itens.append(criarElemento("strong", "", `Pedido #${pedido.id}`)); pedido.items.forEach((item) => { const extrasTexto = item.extras.length ? ` + ${item.extras.map((extra) => extra.name).join(", ")}` : ""; itens.append(criarElemento("span", "", `${item.quantity}x ${item.name}${extrasTexto}`)); });
    const total = criarElemento("div", "order-total"); total.append(criarElemento("strong", "", formatadorMoeda.format(pedido.total))); total.append(criarElemento("span", "", new Date(`${pedido.created_at}Z`).toLocaleString("pt-BR")));
    linha.append(cliente, itens, total); elementos.listaPedidos.append(linha);
  });
}

// ETAPA 7: Carregamento dos dados protegidos.
async function carregarTudo() {
  try {
    [produtos, adicionais, combos, pedidos] = await Promise.all([
      requisitarApi(`${URL_API}/products`), requisitarApi(`${URL_API}/extras`),
      requisitarApi(`${URL_API}/combos`), requisitarApi(`${URL_API}/orders`),
    ]);
    atualizarIndicadores(); renderizarAdicionaisProduto(); renderizarProdutosCombo(); renderizarProdutos(); renderizarCombos(); renderizarPedidos();
  } catch (erro) { mostrarAviso(erro.message, "erro"); }
}

async function carregarPedidos() {
  try { pedidos = await requisitarApi(`${URL_API}/orders`); atualizarIndicadores(); renderizarPedidos(); }
  catch (erro) { mostrarAviso(erro.message, "erro"); }
}

// ETAPA 8: Formulário de produtos.
function atualizarPrevia(campo, destino) {
  destino.replaceChildren();
  if (!campo.value.trim()) { destino.append(criarElemento("span", "", "Prévia da imagem")); return; }
  const imagem = document.createElement("img"); imagem.src = campo.value.trim(); imagem.alt = "Prévia"; destino.append(imagem);
}

function limparProduto() {
  elementos.formularioProduto.reset(); elementos.idProduto.value = ""; elementos.disponivelProduto.checked = true;
  elementos.rotuloProduto.textContent = "Novo cadastro"; elementos.tituloProduto.textContent = "Adicionar produto"; elementos.enviarProduto.textContent = "Cadastrar produto";
  atualizarPrevia(elementos.imagemProduto, elementos.previaProduto); renderizarAdicionaisProduto();
}

function editarProduto(idProduto) {
  const produto = produtos.find((item) => item.id === idProduto); if (!produto) return;
  elementos.idProduto.value = produto.id; elementos.nomeProduto.value = produto.name; elementos.categoriaProduto.value = produto.category; elementos.precoProduto.value = produto.price.toFixed(2); elementos.descricaoProduto.value = produto.description; elementos.imagemProduto.value = produto.image; elementos.disponivelProduto.checked = produto.available;
  elementos.rotuloProduto.textContent = `Editando #${produto.id}`; elementos.tituloProduto.textContent = produto.name; elementos.enviarProduto.textContent = "Salvar alterações";
  atualizarPrevia(elementos.imagemProduto, elementos.previaProduto); renderizarAdicionaisProduto(produto.extras.map((adicional) => adicional.id));
  elementos.formularioProduto.scrollIntoView({ behavior: "smooth" });
}

elementos.formularioProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault(); const idProduto = Number(elementos.idProduto.value); const editando = Boolean(idProduto);
  const extraIds = [...elementos.adicionaisProduto.querySelectorAll('input:checked')].map((campo) => Number(campo.value));
  const produto = { name: elementos.nomeProduto.value, category: elementos.categoriaProduto.value, price: Number(elementos.precoProduto.value), description: elementos.descricaoProduto.value, image: elementos.imagemProduto.value, available: elementos.disponivelProduto.checked, extraIds };
  try { await requisitarApi(editando ? `${URL_API}/products/${idProduto}` : `${URL_API}/products`, { method: editando ? "PUT" : "POST", body: JSON.stringify(produto) }); mostrarAviso(editando ? "Produto atualizado." : "Produto cadastrado."); limparProduto(); await carregarTudo(); }
  catch (erro) { mostrarAviso(erro.message, "erro"); }
});

// ETAPA 9: Formulário de combos.
function limparCombo() {
  elementos.formularioCombo.reset(); elementos.idCombo.value = ""; elementos.disponivelCombo.checked = true;
  elementos.rotuloCombo.textContent = "Novo cadastro"; elementos.tituloCombo.textContent = "Adicionar combo"; elementos.enviarCombo.textContent = "Cadastrar combo";
  atualizarPrevia(elementos.imagemCombo, elementos.previaCombo); renderizarProdutosCombo();
}

function editarCombo(idCombo) {
  const combo = combos.find((item) => item.id === idCombo); if (!combo) return;
  elementos.idCombo.value = combo.id; elementos.nomeCombo.value = combo.name; elementos.precoCombo.value = combo.price.toFixed(2); elementos.descricaoCombo.value = combo.description; elementos.imagemCombo.value = combo.image; elementos.disponivelCombo.checked = combo.available;
  elementos.rotuloCombo.textContent = `Editando #${combo.id}`; elementos.tituloCombo.textContent = combo.name; elementos.enviarCombo.textContent = "Salvar alterações";
  atualizarPrevia(elementos.imagemCombo, elementos.previaCombo); renderizarProdutosCombo(combo.items); elementos.formularioCombo.scrollIntoView({ behavior: "smooth" });
}

elementos.formularioCombo.addEventListener("submit", async (evento) => {
  evento.preventDefault(); const idCombo = Number(elementos.idCombo.value); const editando = Boolean(idCombo);
  const items = [...elementos.produtosCombo.querySelectorAll(".relation-option")].filter((rotulo) => rotulo.querySelector('input[type="checkbox"]').checked).map((rotulo) => ({ productId: Number(rotulo.querySelector('input[type="checkbox"]').value), quantity: Number(rotulo.querySelector('input[type="number"]').value) }));
  const combo = { name: elementos.nomeCombo.value, price: Number(elementos.precoCombo.value), description: elementos.descricaoCombo.value, image: elementos.imagemCombo.value, available: elementos.disponivelCombo.checked, items };
  try { await requisitarApi(editando ? `${URL_API}/combos/${idCombo}` : `${URL_API}/combos`, { method: editando ? "PUT" : "POST", body: JSON.stringify(combo) }); mostrarAviso(editando ? "Combo atualizado." : "Combo cadastrado."); limparCombo(); await carregarTudo(); }
  catch (erro) { mostrarAviso(erro.message, "erro"); }
});

// ETAPA 10: Edição e exclusão pela listagem.
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-action]"); if (!botao) return;
  const id = Number(botao.dataset.id); const recurso = botao.dataset.resource;
  if (botao.dataset.action === "edit") recurso === "product" ? editarProduto(id) : editarCombo(id);
  if (botao.dataset.action === "delete") {
    const item = recurso === "product" ? produtos.find((produto) => produto.id === id) : combos.find((combo) => combo.id === id);
    exclusaoPendente = { recurso, id }; elementos.tituloExclusao.textContent = `Excluir ${recurso === "product" ? "produto" : "combo"}?`; elementos.mensagemExclusao.textContent = `“${item.name}” será removido definitivamente.`; elementos.dialogoExclusao.showModal();
  }
});

elementos.dialogoExclusao.addEventListener("close", async () => {
  if (elementos.dialogoExclusao.returnValue !== "confirm" || !exclusaoPendente) { exclusaoPendente = null; return; }
  const { recurso, id } = exclusaoPendente; exclusaoPendente = null;
  try { await requisitarApi(`${URL_API}/${recurso === "product" ? "products" : "combos"}/${id}`, { method: "DELETE" }); mostrarAviso("Item excluído."); await carregarTudo(); }
  catch (erro) { mostrarAviso(erro.message, "erro"); }
});

elementos.imagemProduto.addEventListener("input", () => atualizarPrevia(elementos.imagemProduto, elementos.previaProduto));
elementos.imagemCombo.addEventListener("input", () => atualizarPrevia(elementos.imagemCombo, elementos.previaCombo));
elementos.cancelarProduto.addEventListener("click", limparProduto);
elementos.cancelarCombo.addEventListener("click", limparCombo);
elementos.buscaProduto.addEventListener("input", renderizarProdutos);
elementos.atualizarPedidos.addEventListener("click", carregarPedidos);

limparProduto(); limparCombo(); verificarSessao();
