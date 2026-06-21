// ETAPA 1: Configurações e elementos da página.
const URL_PRODUTOS = "/api/products?available=1";
const URL_COMBOS = "/api/combos?available=1";
const TAXA_ENTREGA = 6;
const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const botaoMenu = document.querySelector(".menu-toggle");
const linksNavegacao = document.querySelector(".nav-links");
const botaoCabecalho = document.querySelector(".navbar > .btn-small");
const gradeProdutos = document.querySelector("#product-grid");
const gradeCombos = document.querySelector("#combo-grid");
const opcoesSabores = document.querySelector("#flavor-options");
const opcoesCombos = document.querySelector("#order-combo-options");
const listaResumo = document.querySelector("#summary-list");
const totalResumo = document.querySelector("#summary-total");
const botaoFinalizar = document.querySelector("#finish-order");
const mensagemPedido = document.querySelector("#form-message");
const dialogoCheckout = document.querySelector("#checkout-dialog");
const visualizacaoCheckout = document.querySelector("#checkout-form-view");
const visualizacaoSucesso = document.querySelector("#order-success");
const formularioCheckout = document.querySelector("#checkout-form");
const telefoneCliente = document.querySelector("#customer-phone");
const nomeCliente = document.querySelector("#customer-name");
const enderecoCliente = document.querySelector("#customer-address");
const camposCliente = document.querySelector("#customer-fields");
const campoEndereco = document.querySelector("#address-field");
const mensagemBuscaCliente = document.querySelector("#customer-lookup-message");
const itensCheckout = document.querySelector("#checkout-items");
const subtotalCheckout = document.querySelector("#checkout-subtotal");
const taxaCheckout = document.querySelector("#checkout-fee");
const totalCheckout = document.querySelector("#checkout-total");
const dialogoPersonalizacao = document.querySelector("#customization-dialog");
const nomePersonalizacao = document.querySelector("#customization-name");
const descricaoPersonalizacao = document.querySelector("#customization-description");
const imagemPersonalizacao = document.querySelector("#customization-image");
const quantidadePersonalizacaoTexto = document.querySelector("#customization-quantity");
const adicionaisPersonalizacao = document.querySelector("#customization-extras");
const totalPersonalizacao = document.querySelector("#customization-total");

let produtosDisponiveis = [];
let combosDisponiveis = [];
let produtoEmPersonalizacao = null;
let quantidadePersonalizacao = 1;

// ETAPA 2: Menu responsivo e navegação para o topo.
botaoMenu.addEventListener("click", () => {
  const menuAberto = linksNavegacao.classList.toggle("is-open");
  botaoCabecalho.classList.toggle("is-open", menuAberto);
  botaoMenu.setAttribute("aria-expanded", String(menuAberto));
});

linksNavegacao.addEventListener("click", (evento) => {
  if (evento.target.tagName === "A") {
    linksNavegacao.classList.remove("is-open"); botaoCabecalho.classList.remove("is-open");
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

function criarControleQuantidade(nome, acaoAdicionar = "add") {
  const controle = criarElemento("div", "quantity-control");
  const remover = criarElemento("button", "qty-btn", "-"); remover.type = "button"; remover.dataset.action = "remove"; remover.setAttribute("aria-label", `Remover ${nome}`);
  const quantidade = criarElemento("span", "", "0"); quantidade.dataset.qty = "";
  const adicionar = criarElemento("button", "qty-btn", "+"); adicionar.type = "button"; adicionar.dataset.action = acaoAdicionar; adicionar.setAttribute("aria-label", `Adicionar ${nome}`);
  controle.append(remover, quantidade, adicionar); return controle;
}

// ETAPA 3: Renderização da vitrine dinâmica de produtos e combos.
function renderizarCardsProdutos() {
  gradeProdutos.replaceChildren();
  produtosDisponiveis.forEach((produto) => {
    const cartao = criarElemento("article", "product-card");
    const imagem = document.createElement("img"); imagem.src = produto.image; imagem.alt = `Milk-shake ${produto.name}`;
    const informacoes = criarElemento("div", "product-info"); informacoes.append(criarElemento("h3", "", produto.name)); informacoes.append(criarElemento("p", "", produto.description)); informacoes.append(criarElemento("strong", "", formatadorMoeda.format(produto.price)));
    cartao.append(imagem, informacoes); gradeProdutos.append(cartao);
  });
}

function renderizarCardsCombos() {
  gradeCombos.replaceChildren();
  combosDisponiveis.forEach((combo, indice) => {
    const cartao = criarElemento("article", `combo-card${indice % 2 ? " combo-card-featured" : ""}`);
    const imagem = document.createElement("img"); imagem.src = combo.image; imagem.alt = combo.name;
    const conteudo = criarElemento("div", "combo-content"); conteudo.append(criarElemento("span", "combo-tag", indice % 2 ? "Para a galera" : "Favorito da casa")); conteudo.append(criarElemento("h3", "", combo.name)); conteudo.append(criarElemento("p", "", combo.description)); conteudo.append(criarElemento("strong", "", formatadorMoeda.format(combo.price)));
    cartao.append(imagem, conteudo); gradeCombos.append(cartao);
  });
}

// ETAPA 4: Sabores simples; a personalização será feita em um modal.
function renderizarOpcoesSabores() {
  opcoesSabores.replaceChildren();
  produtosDisponiveis.forEach((produto) => {
    const opcao = criarElemento("article", "order-option product-order-option");
    opcao.dataset.id = produto.id; opcao.dataset.price = produto.price; opcao.dataset.qty = "0"; opcao.dataset.kind = "product"; opcao.dataset.extraIds = "[]";
    const cabecalho = criarElemento("div", "order-product-head");
    const textos = document.createElement("div"); textos.append(criarElemento("strong", "", produto.name)); textos.append(criarElemento("span", "", resumirDescricao(produto.description)));
    cabecalho.append(textos, criarControleQuantidade(produto.name, "customize")); opcao.append(cabecalho); opcoesSabores.append(opcao);
  });
}

function renderizarOpcoesCombos() {
  opcoesCombos.replaceChildren();
  combosDisponiveis.forEach((combo) => {
    const opcao = criarElemento("article", "order-option"); opcao.dataset.id = combo.id; opcao.dataset.price = combo.price; opcao.dataset.qty = "0"; opcao.dataset.kind = "combo";
    const textos = document.createElement("div"); textos.append(criarElemento("strong", "", combo.name)); textos.append(criarElemento("span", "", combo.description));
    opcao.append(textos, criarControleQuantidade(combo.name)); opcoesCombos.append(opcao);
  });
}

// ETAPA 5: Leitura do estado atual do pedido.
function obterItensSelecionados() {
  return [...document.querySelectorAll(".order-option")].flatMap((opcao) => {
    const quantidade = Number(opcao.dataset.qty || 0);
    if (!quantidade) return [];
    const tipo = opcao.dataset.kind;
    const idsAdicionais = tipo === "product" ? JSON.parse(opcao.dataset.extraIds || "[]") : [];
    const produto = tipo === "product" ? produtosDisponiveis.find((item) => item.id === Number(opcao.dataset.id)) : null;
    const adicionaisSelecionados = produto ? produto.extras.filter((adicional) => idsAdicionais.includes(adicional.id)) : [];
    return [{ type: tipo, id: Number(opcao.dataset.id), quantity: quantidade, name: opcao.querySelector("strong").textContent, price: Number(opcao.dataset.price), extras: adicionaisSelecionados }];
  });
}

function calcularValores(modalidade = "pickup") {
  const itens = obterItensSelecionados();
  const subtotal = itens.reduce((soma, item) => soma + (item.price + item.extras.reduce((total, extra) => total + extra.price, 0)) * item.quantity, 0);
  const taxa = modalidade === "delivery" ? TAXA_ENTREGA : 0;
  return { itens, subtotal, taxa, total: subtotal + taxa };
}

// ETAPA 6: Resumo da página com adicionais agrupados no produto.
function atualizarResumo() {
  document.querySelectorAll(".order-option").forEach((opcao) => {
    const quantidade = Number(opcao.dataset.qty || 0);
    opcao.querySelector("[data-qty]").textContent = quantidade;
    opcao.classList.toggle("is-selected", quantidade > 0);
  });

  const { itens, total } = calcularValores("pickup");
  listaResumo.replaceChildren();
  if (!itens.length) listaResumo.append(criarElemento("p", "", "Nenhum item selecionado ainda."));
  itens.forEach((item) => {
    const linha = criarElemento("div", "summary-item");
    const descricao = document.createElement("span"); descricao.textContent = `${item.quantity}x ${item.name}`;
    if (item.extras.length) descricao.append(criarElemento("small", "", `+ ${item.extras.map((extra) => extra.name).join(", ")}`));
    const subtotalItem = (item.price + item.extras.reduce((soma, extra) => soma + extra.price, 0)) * item.quantity;
    linha.append(descricao, criarElemento("span", "", formatadorMoeda.format(subtotalItem))); listaResumo.append(linha);
  });
  totalResumo.textContent = formatadorMoeda.format(total);
}

document.querySelector(".order-builder").addEventListener("click", (evento) => {
  const botao = evento.target.closest(".qty-btn"); if (!botao) return;
  const opcao = botao.closest(".order-option"); const quantidadeAtual = Number(opcao.dataset.qty || 0);
  if (botao.dataset.action === "customize") { abrirPersonalizacao(opcao); return; }
  opcao.dataset.qty = String(botao.dataset.action === "add" ? quantidadeAtual + 1 : Math.max(0, quantidadeAtual - 1));
  if (opcao.dataset.kind === "product" && Number(opcao.dataset.qty) === 0) opcao.dataset.extraIds = "[]";
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
  quantidadePersonalizacao = Math.max(1, Number(opcao.dataset.qty || 1));
  const idsSelecionados = JSON.parse(opcao.dataset.extraIds || "[]");
  nomePersonalizacao.textContent = produtoEmPersonalizacao.name;
  descricaoPersonalizacao.textContent = produtoEmPersonalizacao.description;
  imagemPersonalizacao.src = produtoEmPersonalizacao.image;
  imagemPersonalizacao.alt = produtoEmPersonalizacao.name;
  adicionaisPersonalizacao.replaceChildren();
  if (!produtoEmPersonalizacao.extras.length) adicionaisPersonalizacao.append(criarElemento("p", "", "Este sabor não possui adicionais disponíveis."));
  produtoEmPersonalizacao.extras.forEach((adicional) => {
    const rotulo = criarElemento("label", "customization-extra");
    const caixa = document.createElement("input"); caixa.type = "checkbox"; caixa.value = adicional.id; caixa.checked = idsSelecionados.includes(adicional.id);
    const textos = document.createElement("span"); textos.append(criarElemento("strong", "", adicional.name)); textos.append(criarElemento("small", "", adicional.description));
    rotulo.append(caixa, textos, criarElemento("strong", "", `+ ${formatadorMoeda.format(adicional.price)}`)); adicionaisPersonalizacao.append(rotulo);
  });
  atualizarTotalPersonalizacao(); dialogoPersonalizacao.showModal();
}

document.querySelector("#customization-remove").addEventListener("click", () => { quantidadePersonalizacao = Math.max(1, quantidadePersonalizacao - 1); atualizarTotalPersonalizacao(); });
document.querySelector("#customization-add").addEventListener("click", () => { quantidadePersonalizacao += 1; atualizarTotalPersonalizacao(); });
adicionaisPersonalizacao.addEventListener("change", atualizarTotalPersonalizacao);
document.querySelector("#close-customization").addEventListener("click", () => dialogoPersonalizacao.close());
document.querySelector("#save-customization").addEventListener("click", () => {
  if (!produtoEmPersonalizacao) return;
  const opcao = document.querySelector(`.order-option[data-kind="product"][data-id="${produtoEmPersonalizacao.id}"]`);
  opcao.dataset.qty = quantidadePersonalizacao;
  opcao.dataset.extraIds = JSON.stringify([...adicionaisPersonalizacao.querySelectorAll("input:checked")].map((caixa) => Number(caixa.value)));
  dialogoPersonalizacao.close(); mensagemPedido.textContent = ""; atualizarResumo();
});

// ETAPA 8: Modal de checkout e busca do cliente pelo telefone.
function obterModalidade() {
  return formularioCheckout.querySelector('input[name="fulfillment"]:checked')?.value || "delivery";
}

function renderizarResumoCheckout() {
  const modalidade = obterModalidade(); const valores = calcularValores(modalidade);
  itensCheckout.replaceChildren();
  valores.itens.forEach((item) => {
    const linha = criarElemento("div", "checkout-item"); const descricao = document.createElement("span"); descricao.textContent = `${item.quantity}x ${item.name}`;
    if (item.extras.length) descricao.append(criarElemento("small", "", `Adicionais: ${item.extras.map((extra) => extra.name).join(", ")}`));
    const valorItem = (item.price + item.extras.reduce((soma, extra) => soma + extra.price, 0)) * item.quantity;
    linha.append(descricao, criarElemento("strong", "", formatadorMoeda.format(valorItem))); itensCheckout.append(linha);
  });
  subtotalCheckout.textContent = formatadorMoeda.format(valores.subtotal); taxaCheckout.textContent = formatadorMoeda.format(valores.taxa); totalCheckout.textContent = formatadorMoeda.format(valores.total);
  campoEndereco.classList.toggle("hidden", modalidade === "pickup"); enderecoCliente.required = modalidade === "delivery";
}

botaoFinalizar.addEventListener("click", () => {
  if (!obterItensSelecionados().length) { mensagemPedido.textContent = "Adicione pelo menos um sabor ou combo para finalizar."; return; }
  visualizacaoCheckout.classList.remove("hidden"); visualizacaoSucesso.classList.add("hidden"); camposCliente.classList.add("hidden"); mensagemBuscaCliente.textContent = ""; formularioCheckout.reset(); renderizarResumoCheckout(); dialogoCheckout.showModal();
});

document.querySelector("#lookup-customer").addEventListener("click", async () => {
  const telefone = telefoneCliente.value.replace(/\D/g, "");
  if (telefone.length < 10) { mensagemBuscaCliente.textContent = "Informe um telefone válido com DDD."; return; }
  try {
    const resposta = await fetch(`/api/customers/phone/${telefone}`); const dados = await resposta.json();
    camposCliente.classList.remove("hidden");
    if (dados.found) { nomeCliente.value = dados.customer.name; enderecoCliente.value = dados.customer.address; mensagemBuscaCliente.textContent = "Cliente encontrado. Confira seus dados."; }
    else { nomeCliente.value = ""; enderecoCliente.value = ""; mensagemBuscaCliente.textContent = "Novo cliente. Complete seus dados para continuar."; }
    renderizarResumoCheckout(); nomeCliente.focus();
  } catch { mensagemBuscaCliente.textContent = "Não foi possível buscar o cliente."; }
});

formularioCheckout.addEventListener("change", (evento) => {
  if (evento.target.name === "fulfillment") renderizarResumoCheckout();
});

// ETAPA 9: Envio e persistência do pedido.
formularioCheckout.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (camposCliente.classList.contains("hidden")) { mensagemBuscaCliente.textContent = "Consulte o telefone antes de confirmar."; return; }
  const modalidade = obterModalidade();
  const pedido = {
    phone: telefoneCliente.value, name: nomeCliente.value, address: enderecoCliente.value,
    fulfillment: modalidade,
    items: obterItensSelecionados().map((item) => ({ type: item.type, id: item.id, quantity: item.quantity, extraIds: item.extras.map((extra) => extra.id) })),
  };
  try {
    const resposta = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) });
    const resultado = await resposta.json(); if (!resposta.ok) throw new Error(resultado.message);
    visualizacaoCheckout.classList.add("hidden"); visualizacaoSucesso.classList.remove("hidden");
    document.querySelector("#success-order-number").textContent = `Pedido #${resultado.id} · ${formatadorMoeda.format(resultado.total)}`;
    document.querySelector("#success-message").textContent = modalidade === "delivery"
      ? "Aguarde entre 10 e 25 minutos para receber seu pedido em casa."
      : "Seu pedido ficará pronto entre 10 e 25 minutos para retirada no local.";
  } catch (erro) { mensagemBuscaCliente.textContent = erro.message; }
});

document.querySelector("#close-checkout").addEventListener("click", () => dialogoCheckout.close());
document.querySelector("#finish-success").addEventListener("click", () => {
  dialogoCheckout.close();
  document.querySelectorAll(".order-option").forEach((opcao) => { opcao.dataset.qty = "0"; if (opcao.dataset.kind === "product") opcao.dataset.extraIds = "[]"; });
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
    [gradeProdutos, gradeCombos, opcoesSabores, opcoesCombos].forEach((destino) => destino.replaceChildren(criarElemento("p", "loading-state error-state", mensagem)));
    console.error(erro);
  }
}

carregarCardapio();
