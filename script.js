// ETAPA 1: Configuração da API e do formato de moeda.
const URL_API = "/api/products?available=1";
const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ETAPA 2: Seleção dos elementos principais da landing page.
const botaoMenu = document.querySelector(".menu-toggle");
const linksNavegacao = document.querySelector(".nav-links");
const botaoCabecalho = document.querySelector(".navbar > .btn-small");
const gradeProdutos = document.querySelector("#product-grid");
const opcoesSabores = document.querySelector("#flavor-options");
const listaResumo = document.querySelector("#summary-list");
const totalResumo = document.querySelector("#summary-total");
const botaoFinalizar = document.querySelector("#finish-order");
const mensagemPedido = document.querySelector("#form-message");

// ETAPA 3: Funcionamento do menu em telas menores.
botaoMenu.addEventListener("click", () => {
  const menuAberto = linksNavegacao.classList.toggle("is-open");
  botaoCabecalho.classList.toggle("is-open", menuAberto);
  botaoMenu.setAttribute("aria-expanded", String(menuAberto));
});

linksNavegacao.addEventListener("click", (evento) => {
  if (evento.target.tagName === "A") {
    linksNavegacao.classList.remove("is-open");
    botaoCabecalho.classList.remove("is-open");
    botaoMenu.setAttribute("aria-expanded", "false");
  }
});

// O link Início sempre leva ao topo, mesmo quando existe uma âncora na URL.
document.querySelectorAll('a[href="#inicio"]').forEach((linkInicio) => {
  linkInicio.addEventListener("click", (evento) => {
    evento.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", window.location.pathname);
  });
});

// ETAPA 4: Função auxiliar para criar elementos HTML com segurança.
function criarElemento(nomeTag, classe, texto) {
  const elemento = document.createElement(nomeTag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

// ETAPA 5: Criação dos cards da seção Sabores em destaque.
function renderizarCardsProdutos(produtos) {
  gradeProdutos.replaceChildren();

  if (!produtos.length) {
    gradeProdutos.append(criarElemento("p", "loading-state", "Nenhum sabor disponível no momento."));
    return;
  }

  produtos.forEach((produto) => {
    const cartao = criarElemento("article", "product-card");
    const imagem = document.createElement("img");
    imagem.src = produto.image;
    imagem.alt = `Milk-shake ${produto.name}`;
    imagem.addEventListener("error", () => {
      imagem.src = "img/milkshake-hero.png";
    }, { once: true });

    const informacoes = criarElemento("div", "product-info");
    informacoes.append(criarElemento("h3", "", produto.name));
    informacoes.append(criarElemento("p", "", produto.description));
    informacoes.append(criarElemento("strong", "", formatadorMoeda.format(produto.price)));
    cartao.append(imagem, informacoes);
    gradeProdutos.append(cartao);
  });
}

// Reduz descrições extensas para que caibam no montador de pedido.
function resumirDescricao(descricao) {
  const descricaoSemPrefixo = descricao.replace(/^Milk-shake de\s*/i, "");
  return descricaoSemPrefixo.length > 52
    ? `${descricaoSemPrefixo.slice(0, 49).trim()}...`
    : descricaoSemPrefixo;
}

// Cria os botões de menos, quantidade e mais usados em cada item.
function criarControleQuantidade(nomeProduto) {
  const controle = criarElemento("div", "quantity-control");

  const botaoRemover = criarElemento("button", "qty-btn", "-");
  botaoRemover.type = "button";
  botaoRemover.dataset.action = "remove";
  botaoRemover.setAttribute("aria-label", `Remover ${nomeProduto}`);

  const quantidade = criarElemento("span", "", "0");
  quantidade.dataset.qty = "";

  const botaoAdicionar = criarElemento("button", "qty-btn", "+");
  botaoAdicionar.type = "button";
  botaoAdicionar.dataset.action = "add";
  botaoAdicionar.setAttribute("aria-label", `Adicionar ${nomeProduto}`);

  controle.append(botaoRemover, quantidade, botaoAdicionar);
  return controle;
}

// ETAPA 6: Produtos do banco também viram opções no montador de pedido.
function renderizarOpcoesSabores(produtos) {
  opcoesSabores.replaceChildren();

  if (!produtos.length) {
    opcoesSabores.append(criarElemento("p", "loading-state", "Nenhum sabor disponível para pedidos."));
    return;
  }

  produtos.forEach((produto) => {
    const opcao = criarElemento("article", "order-option");
    opcao.dataset.id = `product-${produto.id}`;
    opcao.dataset.price = produto.price;
    opcao.dataset.qty = "0";
    opcao.dataset.kind = "flavor";

    const textos = document.createElement("div");
    textos.append(criarElemento("strong", "", produto.name));
    textos.append(criarElemento("span", "", resumirDescricao(produto.description)));

    opcao.append(textos, criarControleQuantidade(produto.name));
    opcoesSabores.append(opcao);
  });
}

// Busca novamente todas as opções, inclusive as criadas após a resposta da API.
function obterOpcoesPedido() {
  return [...document.querySelectorAll(".order-option")];
}

// ETAPA 7: Cálculo do total e montagem do resumo do pedido.
function atualizarResumo() {
  let total = 0;
  const itensSelecionados = [];

  obterOpcoesPedido().forEach((opcao) => {
    const quantidade = Number(opcao.dataset.qty || 0);
    const preco = Number(opcao.dataset.price);
    const nome = opcao.querySelector("strong").textContent;

    opcao.querySelector("[data-qty]").textContent = quantidade;
    opcao.classList.toggle("is-selected", quantidade > 0);

    if (quantidade > 0) {
      total += quantidade * preco;
      itensSelecionados.push({ nome, quantidade, subtotal: quantidade * preco });
    }
  });

  listaResumo.replaceChildren();

  if (!itensSelecionados.length) {
    listaResumo.append(criarElemento("p", "", "Nenhum item selecionado ainda."));
  } else {
    itensSelecionados.forEach((item) => {
      const linha = criarElemento("div", "summary-item");
      linha.append(
        criarElemento("span", "", `${item.quantidade}x ${item.nome}`),
        criarElemento("span", "", formatadorMoeda.format(item.subtotal))
      );
      listaResumo.append(linha);
    });
  }

  totalResumo.textContent = formatadorMoeda.format(total);
}

// ETAPA 8: Adição e remoção de itens por delegação de eventos.
document.querySelector(".order-builder").addEventListener("click", (evento) => {
  const botao = evento.target.closest(".qty-btn");
  if (!botao) return;

  const opcao = botao.closest(".order-option");
  const quantidadeAtual = Number(opcao.dataset.qty || 0);
  const proximaQuantidade = botao.dataset.action === "add"
    ? quantidadeAtual + 1
    : Math.max(0, quantidadeAtual - 1);

  opcao.dataset.qty = String(proximaQuantidade);
  mensagemPedido.textContent = "";
  atualizarResumo();
});

// O pedido só pode ser finalizado quando existe pelo menos um sabor.
botaoFinalizar.addEventListener("click", () => {
  const possuiSabor = obterOpcoesPedido().some((opcao) => {
    return opcao.dataset.kind === "flavor" && Number(opcao.dataset.qty || 0) > 0;
  });

  mensagemPedido.textContent = possuiSabor
    ? `Pedido finalizado com sucesso! Total: ${totalResumo.textContent}.`
    : "Adicione pelo menos um sabor para finalizar seu pedido.";
});

// ETAPA 9: READ da API para alimentar as duas áreas da landing.
async function carregarProdutos() {
  try {
    const resposta = await fetch(URL_API);
    if (!resposta.ok) throw new Error("Não foi possível carregar os produtos.");

    const produtos = await resposta.json();
    renderizarCardsProdutos(produtos);
    renderizarOpcoesSabores(produtos);
    atualizarResumo();
  } catch (erro) {
    const mensagem = "Não foi possível carregar o cardápio. Inicie o projeto com npm start.";
    gradeProdutos.replaceChildren(criarElemento("p", "loading-state error-state", mensagem));
    opcoesSabores.replaceChildren(criarElemento("p", "loading-state error-state", mensagem));
    console.error(erro);
  }
}

// ETAPA 10: Preparação dos adicionais fixos e carregamento inicial.
document.querySelectorAll(".toppings-panel .order-option").forEach((opcao) => {
  opcao.dataset.qty = "0";
  opcao.dataset.kind = "topping";
});

atualizarResumo();
carregarProdutos();
