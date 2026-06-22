// ETAPA 1: Configurações e elementos da página.
const URL_PRODUTOS = "/api/products?available=1";
const URL_COMBOS = "/api/combos?available=1";
const TAXA_ENTREGA = 6;
const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const botaoMenu = document.querySelector(".alternar-menu");
const linksNavegacao = document.querySelector(".links-navegacao");
const botaoCabecalho = document.querySelector(".barra-navegacao > .botao-pequeno");
const gradeProdutos = document.querySelector("#grade-produtos");
const gradeCombos = document.querySelector("#grade-combos");
const opcoesSabores = document.querySelector("#opcoes-sabores");
const opcoesCombos = document.querySelector("#opcoes-combos-pedido");
const listaResumo = document.querySelector("#lista-resumo");
const totalResumo = document.querySelector("#total-resumo");
const botaoFinalizar = document.querySelector("#finalizar-pedido");
const mensagemPedido = document.querySelector("#mensagem-formulario");
const dialogoCheckout = document.querySelector("#dialogo-finalizacao");
const visualizacaoCheckout = document.querySelector("#visualizacao-formulario-finalizacao");
const visualizacaoSucesso = document.querySelector("#sucesso-pedido");
const formularioCheckout = document.querySelector("#formulario-finalizacao");
const telefoneCliente = document.querySelector("#telefone-cliente");
const nomeCliente = document.querySelector("#nome-cliente");
const enderecoCliente = document.querySelector("#endereco-cliente");
const camposCliente = document.querySelector("#campos-cliente");
const campoEndereco = document.querySelector("#campo-endereco");
const mensagemBuscaCliente = document.querySelector("#mensagem-busca-cliente");
const itensCheckout = document.querySelector("#itens-finalizacao");
const subtotalCheckout = document.querySelector("#subtotal-finalizacao");
const taxaCheckout = document.querySelector("#taxa-finalizacao");
const totalCheckout = document.querySelector("#total-finalizacao");
const dialogoPersonalizacao = document.querySelector("#dialogo-personalizacao");
const nomePersonalizacao = document.querySelector("#nome-personalizacao");
const descricaoPersonalizacao = document.querySelector("#descricao-personalizacao");
const imagemPersonalizacao = document.querySelector("#imagem-personalizacao");
const quantidadePersonalizacaoTexto = document.querySelector("#quantidade-personalizacao");
const adicionaisPersonalizacao = document.querySelector("#adicionais-personalizacao");
const totalPersonalizacao = document.querySelector("#total-personalizacao");

let produtosDisponiveis = [];
let combosDisponiveis = [];
let produtoEmPersonalizacao = null;
let quantidadePersonalizacao = 1;

// ETAPA 2: Menu responsivo e navegação para o topo.
botaoMenu.addEventListener("click", () => {
  const menuAberto = linksNavegacao.classList.toggle("aberto");
  botaoCabecalho.classList.toggle("aberto", menuAberto);
  botaoMenu.setAttribute("aria-expanded", String(menuAberto));
});

linksNavegacao.addEventListener("click", (evento) => {
  if (evento.target.tagName === "A") {
    linksNavegacao.classList.remove("aberto"); botaoCabecalho.classList.remove("aberto");
    botaoMenu.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll('a[href="#inicio"]').forEach((linkInicio) => {
  linkInicio.addEventListener("click", (evento) => {
    evento.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", window.location.pathname);
  });
});

function criarElemento(nomeTag, classe, texto) {
  const elemento = document.createElement(nomeTag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function resumirDescricao(descricao) {
  const texto = descricao.replace(/^Milk-shake de\s*/i, "");
  return texto.length > 64 ? `${texto.slice(0, 61).trim()}...` : texto;
}

function criarControleQuantidade(nome, acaoAdicionar = "adicionar") {
  const controle = criarElemento("div", "controle-quantidade");
  const remover = criarElemento("button", "botao-quantidade", "-"); remover.type = "button"; remover.dataset.acao = "remover"; remover.setAttribute("aria-label", `Remover ${nome}`);
  const quantidade = criarElemento("span", "", "0"); quantidade.dataset.quantidade = "";
  const adicionar = criarElemento("button", "botao-quantidade", "+"); adicionar.type = "button"; adicionar.dataset.acao = acaoAdicionar; adicionar.setAttribute("aria-label", `Adicionar ${nome}`);
  controle.append(remover, quantidade, adicionar); return controle;
}

// ETAPA 3: Renderização da vitrine dinâmica de produtos e combos.
function renderizarCardsProdutos() {
  gradeProdutos.replaceChildren();
  produtosDisponiveis.forEach((produto) => {
    const cartao = criarElemento("article", "cartao-produto");
    const imagem = document.createElement("img"); imagem.src = produto.image; imagem.alt = `Milk-shake ${produto.name}`;
    const informacoes = criarElemento("div", "informacoes-produto"); informacoes.append(criarElemento("h3", "", produto.name)); informacoes.append(criarElemento("p", "", produto.description)); informacoes.append(criarElemento("strong", "", formatadorMoeda.format(produto.price)));
    cartao.append(imagem, informacoes); gradeProdutos.append(cartao);
  });
}

function renderizarCardsCombos() {
  gradeCombos.replaceChildren();
  combosDisponiveis.forEach((combo, indice) => {
    const cartao = criarElemento("article", `cartao-combo${indice % 2 ? " cartao-combo-destaque" : ""}`);
    const imagem = document.createElement("img"); imagem.src = combo.image; imagem.alt = combo.name;
    const conteudo = criarElemento("div", "conteudo-combo"); conteudo.append(criarElemento("span", "etiqueta-combo", indice % 2 ? "Para a galera" : "Favorito da casa")); conteudo.append(criarElemento("h3", "", combo.name)); conteudo.append(criarElemento("p", "", combo.description)); conteudo.append(criarElemento("strong", "", formatadorMoeda.format(combo.price)));
    cartao.append(imagem, conteudo); gradeCombos.append(cartao);
  });
}

// ETAPA 4: Sabores simples; a personalização será feita em um modal.
function renderizarOpcoesSabores() {
  opcoesSabores.replaceChildren();
  produtosDisponiveis.forEach((produto) => {
    const opcao = criarElemento("article", "opcao-pedido opcao-produto-pedido");
    opcao.dataset.id = produto.id; opcao.dataset.preco = produto.price; opcao.dataset.quantidade = "0"; opcao.dataset.tipo = "produto"; opcao.dataset.idsAdicionais = "[]";
    const cabecalho = criarElemento("div", "cabecalho-produto-pedido");
    const textos = document.createElement("div"); textos.append(criarElemento("strong", "", produto.name)); textos.append(criarElemento("span", "", resumirDescricao(produto.description)));
    cabecalho.append(textos, criarControleQuantidade(produto.name, "personalizar")); opcao.append(cabecalho); opcoesSabores.append(opcao);
  });
}

function renderizarOpcoesCombos() {
  opcoesCombos.replaceChildren();
  combosDisponiveis.forEach((combo) => {
    const opcao = criarElemento("article", "opcao-pedido"); opcao.dataset.id = combo.id; opcao.dataset.preco = combo.price; opcao.dataset.quantidade = "0"; opcao.dataset.tipo = "combo";
    const textos = document.createElement("div"); textos.append(criarElemento("strong", "", combo.name)); textos.append(criarElemento("span", "", combo.description));
    opcao.append(textos, criarControleQuantidade(combo.name)); opcoesCombos.append(opcao);
  });
}

// ETAPA 5: Leitura do estado atual do pedido.
function obterItensSelecionados() {
  return [...document.querySelectorAll(".opcao-pedido")].flatMap((opcao) => {
    const quantidade = Number(opcao.dataset.quantidade || 0);
    if (!quantidade) return [];
    const tipo = opcao.dataset.tipo;
    const idsAdicionais = tipo === "produto" ? JSON.parse(opcao.dataset.idsAdicionais || "[]") : [];
    const produto = tipo === "produto" ? produtosDisponiveis.find((item) => item.id === Number(opcao.dataset.id)) : null;
    const adicionaisSelecionados = produto ? produto.extras.filter((adicional) => idsAdicionais.includes(adicional.id)) : [];
    return [{ type: tipo === "produto" ? "product" : "combo", id: Number(opcao.dataset.id), quantity: quantidade, name: opcao.querySelector("strong").textContent, price: Number(opcao.dataset.preco), extras: adicionaisSelecionados }];
  });
}

function calcularValores(modalidade = "retirada") {
  const itens = obterItensSelecionados();
  const subtotal = itens.reduce((soma, item) => soma + (item.price + item.extras.reduce((total, extra) => total + extra.price, 0)) * item.quantity, 0);
  const taxa = modalidade === "entrega" ? TAXA_ENTREGA : 0;
  return { itens, subtotal, taxa, total: subtotal + taxa };
}

// ETAPA 6: Resumo da página com adicionais agrupados no produto.
function atualizarResumo() {
  document.querySelectorAll(".opcao-pedido").forEach((opcao) => {
    const quantidade = Number(opcao.dataset.quantidade || 0);
    opcao.querySelector("[data-quantidade]").textContent = quantidade;
    opcao.classList.toggle("selecionado", quantidade > 0);
  });

  const { itens, total } = calcularValores("retirada");
  listaResumo.replaceChildren();
  if (!itens.length) listaResumo.append(criarElemento("p", "", "Nenhum item selecionado ainda."));
  itens.forEach((item) => {
    const linha = criarElemento("div", "item-resumo");
    const descricao = document.createElement("span"); descricao.textContent = `${item.quantity}x ${item.name}`;
    if (item.extras.length) descricao.append(criarElemento("small", "", `+ ${item.extras.map((extra) => extra.name).join(", ")}`));
    const subtotalItem = (item.price + item.extras.reduce((soma, extra) => soma + extra.price, 0)) * item.quantity;
    linha.append(descricao, criarElemento("span", "", formatadorMoeda.format(subtotalItem))); listaResumo.append(linha);
  });
  totalResumo.textContent = formatadorMoeda.format(total);
}

document.querySelector(".montador-pedido").addEventListener("click", (evento) => {
  const botao = evento.target.closest(".botao-quantidade"); if (!botao) return;
  const opcao = botao.closest(".opcao-pedido"); const quantidadeAtual = Number(opcao.dataset.quantidade || 0);
  if (botao.dataset.acao === "personalizar") { abrirPersonalizacao(opcao); return; }
  opcao.dataset.quantidade = String(botao.dataset.acao === "adicionar" ? quantidadeAtual + 1 : Math.max(0, quantidadeAtual - 1));
  if (opcao.dataset.tipo === "produto" && Number(opcao.dataset.quantidade) === 0) opcao.dataset.idsAdicionais = "[]";
  mensagemPedido.textContent = ""; atualizarResumo();
});

// ETAPA 7: Modal bem diagramado para quantidade e adicionais do sabor.
function atualizarTotalPersonalizacao() {
  if (!produtoEmPersonalizacao) return;
  const adicionaisMarcados = [...adicionaisPersonalizacao.querySelectorAll("input:checked")]
    .map((caixa) => produtoEmPersonalizacao.extras.find((adicional) => adicional.id === Number(caixa.value)))
    .filter(Boolean);
  const valorUnitario = produtoEmPersonalizacao.price + adicionaisMarcados.reduce((soma, adicional) => soma + adicional.price, 0);
  quantidadePersonalizacaoTexto.textContent = quantidadePersonalizacao;
  totalPersonalizacao.textContent = formatadorMoeda.format(valorUnitario * quantidadePersonalizacao);
}

function abrirPersonalizacao(opcao) {
  produtoEmPersonalizacao = produtosDisponiveis.find((produto) => produto.id === Number(opcao.dataset.id));
  if (!produtoEmPersonalizacao) return;
  quantidadePersonalizacao = Math.max(1, Number(opcao.dataset.quantidade || 1));
  const idsSelecionados = JSON.parse(opcao.dataset.idsAdicionais || "[]");
  nomePersonalizacao.textContent = produtoEmPersonalizacao.name;
  descricaoPersonalizacao.textContent = produtoEmPersonalizacao.description;
  imagemPersonalizacao.src = produtoEmPersonalizacao.image;
  imagemPersonalizacao.alt = produtoEmPersonalizacao.name;
  adicionaisPersonalizacao.replaceChildren();
  if (!produtoEmPersonalizacao.extras.length) adicionaisPersonalizacao.append(criarElemento("p", "", "Este sabor não possui adicionais disponíveis."));
  produtoEmPersonalizacao.extras.forEach((adicional) => {
    const rotulo = criarElemento("label", "adicional-personalizacao");
    const caixa = document.createElement("input"); caixa.type = "checkbox"; caixa.value = adicional.id; caixa.checked = idsSelecionados.includes(adicional.id);
    const textos = document.createElement("span"); textos.append(criarElemento("strong", "", adicional.name)); textos.append(criarElemento("small", "", adicional.description));
    rotulo.append(caixa, textos, criarElemento("strong", "", `+ ${formatadorMoeda.format(adicional.price)}`)); adicionaisPersonalizacao.append(rotulo);
  });
  atualizarTotalPersonalizacao(); dialogoPersonalizacao.showModal();
}

document.querySelector("#remover-personalizacao").addEventListener("click", () => { quantidadePersonalizacao = Math.max(1, quantidadePersonalizacao - 1); atualizarTotalPersonalizacao(); });
document.querySelector("#adicionar-personalizacao").addEventListener("click", () => { quantidadePersonalizacao += 1; atualizarTotalPersonalizacao(); });
adicionaisPersonalizacao.addEventListener("change", atualizarTotalPersonalizacao);
document.querySelector("#fechar-personalizacao").addEventListener("click", () => dialogoPersonalizacao.close());
document.querySelector("#salvar-personalizacao").addEventListener("click", () => {
  if (!produtoEmPersonalizacao) return;
  const opcao = document.querySelector(`.opcao-pedido[data-tipo="produto"][data-id="${produtoEmPersonalizacao.id}"]`);
  opcao.dataset.quantidade = quantidadePersonalizacao;
  opcao.dataset.idsAdicionais = JSON.stringify([...adicionaisPersonalizacao.querySelectorAll("input:checked")].map((caixa) => Number(caixa.value)));
  dialogoPersonalizacao.close(); mensagemPedido.textContent = ""; atualizarResumo();
});

// ETAPA 8: Modal de checkout e busca do cliente pelo telefone.
function obterModalidade() {
  return formularioCheckout.querySelector('input[name="modalidade"]:checked')?.value || "entrega";
}

function renderizarResumoCheckout() {
  const modalidade = obterModalidade(); const valores = calcularValores(modalidade);
  itensCheckout.replaceChildren();
  valores.itens.forEach((item) => {
    const linha = criarElemento("div", "item-finalizacao"); const descricao = document.createElement("span"); descricao.textContent = `${item.quantity}x ${item.name}`;
    if (item.extras.length) descricao.append(criarElemento("small", "", `Adicionais: ${item.extras.map((extra) => extra.name).join(", ")}`));
    const valorItem = (item.price + item.extras.reduce((soma, extra) => soma + extra.price, 0)) * item.quantity;
    linha.append(descricao, criarElemento("strong", "", formatadorMoeda.format(valorItem))); itensCheckout.append(linha);
  });
  subtotalCheckout.textContent = formatadorMoeda.format(valores.subtotal); taxaCheckout.textContent = formatadorMoeda.format(valores.taxa); totalCheckout.textContent = formatadorMoeda.format(valores.total);
  campoEndereco.classList.toggle("oculto", modalidade === "retirada"); enderecoCliente.required = modalidade === "entrega";
}

botaoFinalizar.addEventListener("click", () => {
  if (!obterItensSelecionados().length) { mensagemPedido.textContent = "Adicione pelo menos um sabor ou combo para finalizar."; return; }
  visualizacaoCheckout.classList.remove("oculto"); visualizacaoSucesso.classList.add("oculto"); camposCliente.classList.add("oculto"); mensagemBuscaCliente.textContent = ""; formularioCheckout.reset(); renderizarResumoCheckout(); dialogoCheckout.showModal();
});

document.querySelector("#buscar-cliente").addEventListener("click", async () => {
  const telefone = telefoneCliente.value.replace(/\D/g, "");
  if (telefone.length < 10) { mensagemBuscaCliente.textContent = "Informe um telefone válido com DDD."; return; }
  try {
    const resposta = await fetch(`/api/customers/phone/${telefone}`); const dados = await resposta.json();
    camposCliente.classList.remove("oculto");
    if (dados.found) { nomeCliente.value = dados.customer.name; enderecoCliente.value = dados.customer.address; mensagemBuscaCliente.textContent = "Cliente encontrado. Confira seus dados."; }
    else { nomeCliente.value = ""; enderecoCliente.value = ""; mensagemBuscaCliente.textContent = "Novo cliente. Complete seus dados para continuar."; }
    renderizarResumoCheckout(); nomeCliente.focus();
  } catch { mensagemBuscaCliente.textContent = "Não foi possível buscar o cliente."; }
});

formularioCheckout.addEventListener("change", (evento) => {
  if (evento.target.name === "modalidade") renderizarResumoCheckout();
});

// ETAPA 9: Envio e persistência do pedido.
formularioCheckout.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (camposCliente.classList.contains("oculto")) { mensagemBuscaCliente.textContent = "Consulte o telefone antes de confirmar."; return; }
  const modalidade = obterModalidade();
  const pedido = {
    phone: telefoneCliente.value, name: nomeCliente.value, address: enderecoCliente.value,
    fulfillment: modalidade === "entrega" ? "delivery" : "pickup",
    items: obterItensSelecionados().map((item) => ({ type: item.type, id: item.id, quantity: item.quantity, extraIds: item.extras.map((extra) => extra.id) })),
  };
  try {
    const resposta = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) });
    const resultado = await resposta.json(); if (!resposta.ok) throw new Error(resultado.message);
    visualizacaoCheckout.classList.add("oculto"); visualizacaoSucesso.classList.remove("oculto");
    document.querySelector("#numero-pedido-sucesso").textContent = `Pedido #${resultado.id} · ${formatadorMoeda.format(resultado.total)}`;
    document.querySelector("#mensagem-sucesso").textContent = modalidade === "entrega"
      ? "Aguarde entre 10 e 25 minutos para receber seu pedido em casa."
      : "Seu pedido ficará pronto entre 10 e 25 minutos para retirada no local.";
  } catch (erro) { mensagemBuscaCliente.textContent = erro.message; }
});

document.querySelector("#fechar-finalizacao").addEventListener("click", () => dialogoCheckout.close());
document.querySelector("#finalizar-sucesso").addEventListener("click", () => {
  dialogoCheckout.close();
  document.querySelectorAll(".opcao-pedido").forEach((opcao) => { opcao.dataset.quantidade = "0"; if (opcao.dataset.tipo === "produto") opcao.dataset.idsAdicionais = "[]"; });
  atualizarResumo();
});

// ETAPA 10: Carregamento paralelo dos dados públicos.
async function carregarCardapio() {
  try {
    const [respostaProdutos, respostaCombos] = await Promise.all([fetch(URL_PRODUTOS), fetch(URL_COMBOS)]);
    if (!respostaProdutos.ok || !respostaCombos.ok) throw new Error("Não foi possível carregar o cardápio.");
    produtosDisponiveis = await respostaProdutos.json(); combosDisponiveis = await respostaCombos.json();
    renderizarCardsProdutos(); renderizarCardsCombos(); renderizarOpcoesSabores(); renderizarOpcoesCombos(); atualizarResumo();
  } catch (erro) {
    const mensagem = "Não foi possível carregar o cardápio. Inicie o projeto com npm start.";
    [gradeProdutos, gradeCombos, opcoesSabores, opcoesCombos].forEach((destino) => destino.replaceChildren(criarElemento("p", "estado-carregando estado-erro", mensagem)));
    console.error(erro);
  }
}

carregarCardapio();
