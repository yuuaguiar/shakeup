// ETAPA 1: Configurações e elementos principais.
const URL_API = "/api";
const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const elementos = {
  telaLogin: document.querySelector("#tela-login"), aplicativo: document.querySelector("#aplicativo-administrativo"),
  formularioLogin: document.querySelector("#formulario-login"), usuario: document.querySelector("#usuario-login"),
  senha: document.querySelector("#senha-login"), mensagemLogin: document.querySelector("#mensagem-login"),
  botaoSair: document.querySelector("#botao-sair"), abas: document.querySelectorAll(".aba-administrativa"),
  visualizacoes: document.querySelectorAll(".visualizacao-aba"), aviso: document.querySelector("#aviso"),
  totalProdutos: document.querySelector("#estatistica-produtos"), totalCombos: document.querySelector("#estatistica-combos"),
  totalPedidos: document.querySelector("#estatistica-pedidos"), formularioProduto: document.querySelector("#formulario-produto"),
  idProduto: document.querySelector("#id-produto"), nomeProduto: document.querySelector("#nome-produto"),
  categoriaProduto: document.querySelector("#categoria-produto"), precoProduto: document.querySelector("#preco-produto"),
  descricaoProduto: document.querySelector("#descricao-produto"), imagemProduto: document.querySelector("#imagem-produto"),
  disponivelProduto: document.querySelector("#produto-disponivel"), previaProduto: document.querySelector("#previa-produto"),
  adicionaisProduto: document.querySelector("#adicionais-produto"), tituloProduto: document.querySelector("#titulo-formulario-produto"),
  rotuloProduto: document.querySelector("#rotulo-formulario-produto"), enviarProduto: document.querySelector("#enviar-produto"),
  cancelarProduto: document.querySelector("#cancelar-produto"), buscaProduto: document.querySelector("#busca-produto"),
  listaProdutos: document.querySelector("#lista-produtos-admin"), formularioCombo: document.querySelector("#formulario-combo"),
  idCombo: document.querySelector("#id-combo"), nomeCombo: document.querySelector("#nome-combo"),
  precoCombo: document.querySelector("#preco-combo"), descricaoCombo: document.querySelector("#descricao-combo"),
  imagemCombo: document.querySelector("#imagem-combo"), disponivelCombo: document.querySelector("#combo-disponivel"),
  previaCombo: document.querySelector("#previa-combo"), produtosCombo: document.querySelector("#produtos-combo"),
  tituloCombo: document.querySelector("#titulo-formulario-combo"), rotuloCombo: document.querySelector("#rotulo-formulario-combo"),
  enviarCombo: document.querySelector("#enviar-combo"), cancelarCombo: document.querySelector("#cancelar-combo"),
  listaCombos: document.querySelector("#lista-combos-admin"), listaPedidos: document.querySelector("#lista-pedidos-admin"),
  listaPedidosConcluidos: document.querySelector("#lista-pedidos-concluidos"), avisoPedidos: document.querySelector("#aviso-pedidos"),
  atualizarPedidos: document.querySelector("#atualizar-pedidos"), dialogoExclusao: document.querySelector("#dialogo-exclusao"),
  tituloExclusao: document.querySelector("#titulo-exclusao"), mensagemExclusao: document.querySelector("#mensagem-exclusao"),
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
  elementos.aviso.classList.toggle("erro", tipo === "erro");
  elementos.aviso.classList.add("visivel");
  temporizadorAviso = window.setTimeout(() => elementos.aviso.classList.remove("visivel"), 3200);
}

// ETAPA 3: Login, sessão e saída do painel.
function exibirLogin() {
  elementos.telaLogin.classList.remove("oculto");
  elementos.aplicativo.classList.add("oculto");
}

async function exibirPainel() {
  elementos.telaLogin.classList.add("oculto");
  elementos.aplicativo.classList.remove("oculto");
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
    elementos.abas.forEach((item) => item.classList.toggle("ativo", item === aba));
    elementos.visualizacoes.forEach((visualizacao) => {
      visualizacao.classList.toggle("oculto", visualizacao.id !== `visualizacao-${aba.dataset.aba}`);
    });
  });
});

function atualizarIndicadores() {
  const quantidadeNovos = pedidos.filter((pedido) => pedido.status !== "completed").length;
  elementos.totalProdutos.textContent = produtos.length;
  elementos.totalCombos.textContent = combos.length;
  elementos.totalPedidos.textContent = pedidos.length;
  elementos.avisoPedidos.textContent = quantidadeNovos;
  elementos.avisoPedidos.classList.toggle("oculto", quantidadeNovos === 0);
}

// ETAPA 5: Renderização dos vínculos de adicionais e composição de combos.
function renderizarAdicionaisProduto(idsSelecionados = []) {
  const selecionados = new Set(idsSelecionados.map(Number));
  elementos.adicionaisProduto.replaceChildren();
  adicionais.forEach((adicional) => {
    const rotulo = criarElemento("label", "opcao-relacao");
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
    const rotulo = criarElemento("label", "opcao-relacao");
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
  const linha = criarElemento("article", "linha-produto-admin");
  const imagem = document.createElement("img"); imagem.src = item.image; imagem.alt = `Foto de ${item.name}`;
  const conteudo = criarElemento("div", "produto-principal"); conteudo.append(criarElemento("h3", "", item.name)); conteudo.append(criarElemento("p", "", item.description));
  const metadados = criarElemento("div", "dados-produto"); metadados.append(criarElemento("strong", "", formatadorMoeda.format(item.price)));
  if (recurso === "produto") metadados.append(criarElemento("span", "", `${item.extras.length} adicionais vinculados`));
  else metadados.append(criarElemento("span", "", `${item.items.length} produtos no combo`));
  metadados.append(criarElemento("span", `etiqueta-status${item.available ? "" : " inativo"}`, item.available ? "Disponível" : "Indisponível")); conteudo.append(metadados);
  const acoes = criarElemento("div", "acoes-linha");
  [
    ["Editar", "editar", "acao-linha"], ["Excluir", "excluir", "acao-linha perigo"],
  ].forEach(([texto, acao, classe]) => { const botao = criarElemento("button", classe, texto); botao.type = "button"; botao.dataset.acao = acao; botao.dataset.recurso = recurso; botao.dataset.id = item.id; acoes.append(botao); });
  linha.append(imagem, conteudo, acoes); return linha;
}

function renderizarProdutos() {
  const termo = elementos.buscaProduto.value.trim().toLocaleLowerCase("pt-BR");
  const filtrados = produtos.filter((produto) => `${produto.name} ${produto.category}`.toLocaleLowerCase("pt-BR").includes(termo));
  elementos.listaProdutos.replaceChildren();
  if (!filtrados.length) elementos.listaProdutos.append(criarElemento("p", "estado-vazio", "Nenhum produto encontrado."));
  else filtrados.forEach((produto) => elementos.listaProdutos.append(criarLinhaAdministrativa(produto, "produto")));
}

function renderizarCombos() {
  elementos.listaCombos.replaceChildren();
  if (!combos.length) elementos.listaCombos.append(criarElemento("p", "estado-vazio", "Nenhum combo cadastrado."));
  else combos.forEach((combo) => elementos.listaCombos.append(criarLinhaAdministrativa(combo, "combo")));
}

function renderizarPedidos() {
  const pedidosNovos = pedidos.filter((pedido) => pedido.status !== "completed");
  const pedidosConcluidos = pedidos.filter((pedido) => pedido.status === "completed");
  elementos.listaPedidos.replaceChildren(); elementos.listaPedidosConcluidos.replaceChildren();

  function criarLinhaPedido(pedido, concluido) {
    const linha = criarElemento("article", "linha-pedido");
    const cliente = criarElemento("div", "cliente-pedido"); cliente.append(criarElemento("strong", "", pedido.customer_name)); cliente.append(criarElemento("span", "", pedido.phone)); cliente.append(criarElemento("span", "", pedido.fulfillment === "delivery" ? pedido.address : "Retirada no local"));
    const itens = criarElemento("div", "itens-pedido"); itens.append(criarElemento("strong", "", `Pedido #${pedido.id}`)); pedido.items.forEach((item) => { const extrasTexto = item.extras.length ? ` + ${item.extras.map((extra) => extra.name).join(", ")}` : ""; itens.append(criarElemento("span", "", `${item.quantity}x ${item.name}${extrasTexto}`)); });
    const total = criarElemento("div", "total-pedido"); total.append(criarElemento("strong", "", formatadorMoeda.format(pedido.total))); total.append(criarElemento("span", "", new Date(`${pedido.created_at}Z`).toLocaleString("pt-BR")));
    if (concluido) {
      total.append(criarElemento("span", "rotulo-concluido", "Concluído"));
    } else {
      const botaoConcluir = criarElemento("button", "botao-concluir-pedido", "Marcar como concluído");
      botaoConcluir.type = "button"; botaoConcluir.dataset.acao = "concluir-pedido"; botaoConcluir.dataset.id = pedido.id; total.append(botaoConcluir);
    }
    linha.append(cliente, itens, total); return linha;
  }

  if (!pedidosNovos.length) elementos.listaPedidos.append(criarElemento("p", "estado-vazio", "Nenhum pedido novo."));
  else pedidosNovos.forEach((pedido) => elementos.listaPedidos.append(criarLinhaPedido(pedido, false)));
  if (!pedidosConcluidos.length) elementos.listaPedidosConcluidos.append(criarElemento("p", "estado-vazio", "Nenhum pedido concluído."));
  else pedidosConcluidos.forEach((pedido) => elementos.listaPedidosConcluidos.append(criarLinhaPedido(pedido, true)));
}

async function concluirPedido(idPedido) {
  try {
    await requisitarApi(`${URL_API}/orders/${idPedido}/status`, { method: "PUT", body: JSON.stringify({ status: "completed" }) });
    mostrarAviso(`Pedido #${idPedido} concluído.`); await carregarPedidos();
  } catch (erro) { mostrarAviso(erro.message, "erro"); }
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
  const items = [...elementos.produtosCombo.querySelectorAll(".opcao-relacao")].filter((rotulo) => rotulo.querySelector('input[type="checkbox"]').checked).map((rotulo) => ({ productId: Number(rotulo.querySelector('input[type="checkbox"]').value), quantity: Number(rotulo.querySelector('input[type="number"]').value) }));
  const combo = { name: elementos.nomeCombo.value, price: Number(elementos.precoCombo.value), description: elementos.descricaoCombo.value, image: elementos.imagemCombo.value, available: elementos.disponivelCombo.checked, items };
  try { await requisitarApi(editando ? `${URL_API}/combos/${idCombo}` : `${URL_API}/combos`, { method: editando ? "PUT" : "POST", body: JSON.stringify(combo) }); mostrarAviso(editando ? "Combo atualizado." : "Combo cadastrado."); limparCombo(); await carregarTudo(); }
  catch (erro) { mostrarAviso(erro.message, "erro"); }
});

// ETAPA 10: Edição e exclusão pela listagem.
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]"); if (!botao) return;
  if (botao.dataset.acao === "concluir-pedido") { concluirPedido(Number(botao.dataset.id)); return; }
  const id = Number(botao.dataset.id); const recurso = botao.dataset.recurso;
  if (botao.dataset.acao === "editar") recurso === "produto" ? editarProduto(id) : editarCombo(id);
  if (botao.dataset.acao === "excluir") {
    const item = recurso === "produto" ? produtos.find((produto) => produto.id === id) : combos.find((combo) => combo.id === id);
    exclusaoPendente = { recurso, id }; elementos.tituloExclusao.textContent = `Excluir ${recurso}?`; elementos.mensagemExclusao.textContent = `“${item.name}” será removido definitivamente.`; elementos.dialogoExclusao.showModal();
  }
});

elementos.dialogoExclusao.addEventListener("close", async () => {
  if (elementos.dialogoExclusao.returnValue !== "confirmar" || !exclusaoPendente) { exclusaoPendente = null; return; }
  const { recurso, id } = exclusaoPendente; exclusaoPendente = null;
  try { await requisitarApi(`${URL_API}/${recurso === "produto" ? "products" : "combos"}/${id}`, { method: "DELETE" }); mostrarAviso("Item excluído."); await carregarTudo(); }
  catch (erro) { mostrarAviso(erro.message, "erro"); }
});

elementos.imagemProduto.addEventListener("input", () => atualizarPrevia(elementos.imagemProduto, elementos.previaProduto));
elementos.imagemCombo.addEventListener("input", () => atualizarPrevia(elementos.imagemCombo, elementos.previaCombo));
elementos.cancelarProduto.addEventListener("click", limparProduto);
elementos.cancelarCombo.addEventListener("click", limparCombo);
elementos.buscaProduto.addEventListener("input", renderizarProdutos);
elementos.atualizarPedidos.addEventListener("click", carregarPedidos);

limparProduto(); limparCombo(); verificarSessao();
