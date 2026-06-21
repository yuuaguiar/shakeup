// ETAPA 1: Configuração da API e do formato de moeda brasileira.
const URL_API = "/api/products";
const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ETAPA 2: Seleção dos elementos HTML utilizados pelo painel.
const elementos = {
  formulario: document.querySelector("#product-form"),
  id: document.querySelector("#product-id"),
  nome: document.querySelector("#product-name"),
  categoria: document.querySelector("#product-category"),
  preco: document.querySelector("#product-price"),
  descricao: document.querySelector("#product-description"),
  imagem: document.querySelector("#product-image"),
  disponivel: document.querySelector("#product-available"),
  previa: document.querySelector("#image-preview"),
  rotuloFormulario: document.querySelector("#form-kicker"),
  tituloFormulario: document.querySelector("#form-title"),
  botaoEnviar: document.querySelector("#submit-product"),
  botaoCancelar: document.querySelector("#cancel-edit"),
  botaoNovoProduto: document.querySelector("#new-product"),
  lista: document.querySelector("#admin-product-list"),
  busca: document.querySelector("#product-search"),
  total: document.querySelector("#stat-total"),
  totalDisponiveis: document.querySelector("#stat-available"),
  totalIndisponiveis: document.querySelector("#stat-unavailable"),
  aviso: document.querySelector("#toast"),
  dialogoExclusao: document.querySelector("#delete-dialog"),
  mensagemExclusao: document.querySelector("#delete-message"),
  confirmarExclusao: document.querySelector("#confirm-delete"),
};

// ETAPA 3: Estado temporário da interface.
let produtos = [];
let idPendenteExclusao = null;
let temporizadorAviso = null;

// Exibe uma mensagem de sucesso ou erro no canto da tela.
function mostrarAviso(mensagem, tipo = "sucesso") {
  window.clearTimeout(temporizadorAviso);
  elementos.aviso.textContent = mensagem;
  elementos.aviso.classList.toggle("error", tipo === "erro");
  elementos.aviso.classList.add("show");
  temporizadorAviso = window.setTimeout(() => elementos.aviso.classList.remove("show"), 3200);
}

// Centraliza as chamadas à API e o tratamento de erros HTTP.
async function requisitarApi(endereco, opcoes = {}) {
  const resposta = await fetch(endereco, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...opcoes.headers,
    },
  });

  const dados = resposta.status === 204 ? null : await resposta.json();
  if (!resposta.ok) {
    const detalhes = dados?.errors?.join(" ");
    throw new Error(detalhes || dados?.message || "Não foi possível concluir a operação.");
  }
  return dados;
}

// Cria elementos HTML evitando a montagem de conteúdo com strings inseguras.
function criarElemento(nomeTag, classe, texto) {
  const elemento = document.createElement(nomeTag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

// ETAPA 4: Atualização dos indicadores superiores do painel.
function atualizarIndicadores() {
  const quantidadeDisponiveis = produtos.filter((produto) => produto.available).length;
  elementos.total.textContent = produtos.length;
  elementos.totalDisponiveis.textContent = quantidadeDisponiveis;
  elementos.totalIndisponiveis.textContent = produtos.length - quantidadeDisponiveis;
}

// Monta visualmente uma linha de produto com seus botões de ação.
function criarLinhaProduto(produto) {
  const linha = criarElemento("article", "admin-product-row");
  linha.dataset.id = produto.id;

  const imagem = document.createElement("img");
  imagem.src = produto.image;
  imagem.alt = `Foto de ${produto.name}`;
  imagem.addEventListener("error", () => {
    imagem.src = "img/milkshake-hero.png";
  }, { once: true });

  const conteudoPrincipal = criarElemento("div", "product-main");
  conteudoPrincipal.append(criarElemento("h3", "", produto.name));
  conteudoPrincipal.append(criarElemento("p", "", produto.description));

  const metadados = criarElemento("div", "product-meta");
  metadados.append(criarElemento("strong", "", formatadorMoeda.format(produto.price)));
  metadados.append(criarElemento("span", "", produto.category));
  metadados.append(criarElemento(
    "span",
    `status-badge${produto.available ? "" : " off"}`,
    produto.available ? "Disponível" : "Indisponível"
  ));
  conteudoPrincipal.append(metadados);

  const acoes = criarElemento("div", "row-actions");
  const botaoEditar = criarElemento("button", "row-action", "Editar");
  botaoEditar.type = "button";
  botaoEditar.dataset.action = "edit";
  botaoEditar.dataset.id = produto.id;

  const botaoExcluir = criarElemento("button", "row-action danger", "Excluir");
  botaoExcluir.type = "button";
  botaoExcluir.dataset.action = "delete";
  botaoExcluir.dataset.id = produto.id;
  acoes.append(botaoEditar, botaoExcluir);

  linha.append(imagem, conteudoPrincipal, acoes);
  return linha;
}

// ETAPA 5: Filtragem e renderização da listagem de produtos.
function renderizarProdutos() {
  const termo = elementos.busca.value.trim().toLocaleLowerCase("pt-BR");
  const produtosFiltrados = produtos.filter((produto) => {
    const textoPesquisavel = `${produto.name} ${produto.category}`.toLocaleLowerCase("pt-BR");
    return textoPesquisavel.includes(termo);
  });

  elementos.lista.replaceChildren();
  if (!produtosFiltrados.length) {
    const mensagem = termo
      ? "Nenhum produto encontrado para essa busca."
      : "Nenhum produto cadastrado.";
    elementos.lista.append(criarElemento("p", "empty-state", mensagem));
    return;
  }

  produtosFiltrados.forEach((produto) => elementos.lista.append(criarLinhaProduto(produto)));
}

// READ: consulta os produtos cadastrados no banco.
async function carregarProdutos() {
  elementos.lista.innerHTML = '<p class="empty-state">Carregando produtos...</p>';
  try {
    produtos = await requisitarApi(URL_API);
    atualizarIndicadores();
    renderizarProdutos();
  } catch (erro) {
    elementos.lista.innerHTML = '<p class="empty-state">Não foi possível carregar o cardápio.</p>';
    mostrarAviso(erro.message, "erro");
  }
}

// ETAPA 6: Prévia da imagem informada no formulário.
function renderizarPrevia() {
  const enderecoImagem = elementos.imagem.value.trim();
  elementos.previa.replaceChildren();

  if (!enderecoImagem) {
    elementos.previa.append(criarElemento("span", "", "A prévia da imagem aparecerá aqui."));
    return;
  }

  const imagem = document.createElement("img");
  imagem.src = enderecoImagem;
  imagem.alt = "Prévia do produto";
  imagem.addEventListener("error", () => {
    elementos.previa.replaceChildren(criarElemento("span", "", "Não foi possível carregar essa imagem."));
  }, { once: true });
  elementos.previa.append(imagem);
}

// Retorna o formulário ao modo de cadastro.
function limparFormulario({ focar = false } = {}) {
  elementos.formulario.reset();
  elementos.id.value = "";
  elementos.disponivel.checked = true;
  elementos.rotuloFormulario.textContent = "Novo cadastro";
  elementos.tituloFormulario.textContent = "Adicionar produto";
  elementos.botaoEnviar.textContent = "Cadastrar produto";
  renderizarPrevia();

  if (focar) {
    document.querySelector("#form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    elementos.nome.focus({ preventScroll: true });
  }
}

// ETAPA 7: Preenchimento do formulário para a operação de alteração.
function editarProduto(idProduto) {
  const produto = produtos.find((item) => item.id === idProduto);
  if (!produto) return;

  elementos.id.value = produto.id;
  elementos.nome.value = produto.name;
  elementos.categoria.value = produto.category;
  elementos.preco.value = produto.price.toFixed(2);
  elementos.descricao.value = produto.description;
  elementos.imagem.value = produto.image;
  elementos.disponivel.checked = produto.available;
  elementos.rotuloFormulario.textContent = `Editando produto #${produto.id}`;
  elementos.tituloFormulario.textContent = produto.name;
  elementos.botaoEnviar.textContent = "Salvar alterações";
  renderizarPrevia();
  document.querySelector("#form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Abre a confirmação antes de excluir definitivamente.
function solicitarExclusao(idProduto) {
  const produto = produtos.find((item) => item.id === idProduto);
  if (!produto) return;

  idPendenteExclusao = idProduto;
  elementos.mensagemExclusao.textContent = `“${produto.name}” será removido do banco de dados, da landing page e do montador de pedido.`;
  elementos.dialogoExclusao.showModal();
}

// ETAPA 8: CREATE ou UPDATE, dependendo da presença de um ID.
elementos.formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!elementos.formulario.reportValidity()) return;

  const idProduto = Number(elementos.id.value);
  const estaEditando = Boolean(idProduto);
  const produto = {
    name: elementos.nome.value,
    category: elementos.categoria.value,
    price: Number(elementos.preco.value),
    description: elementos.descricao.value,
    image: elementos.imagem.value,
    available: elementos.disponivel.checked,
  };

  elementos.botaoEnviar.disabled = true;
  elementos.botaoEnviar.textContent = estaEditando ? "Salvando..." : "Cadastrando...";

  try {
    await requisitarApi(estaEditando ? `${URL_API}/${idProduto}` : URL_API, {
      method: estaEditando ? "PUT" : "POST",
      body: JSON.stringify(produto),
    });
    mostrarAviso(estaEditando ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
    limparFormulario();
    await carregarProdutos();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  } finally {
    elementos.botaoEnviar.disabled = false;
    if (!elementos.id.value) elementos.botaoEnviar.textContent = "Cadastrar produto";
  }
});

// Identifica qual botão foi clicado dentro da listagem.
elementos.lista.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-action]");
  if (!botao) return;

  const idProduto = Number(botao.dataset.id);
  if (botao.dataset.action === "edit") editarProduto(idProduto);
  if (botao.dataset.action === "delete") solicitarExclusao(idProduto);
});

// ETAPA 9: DELETE após o fechamento confirmado do diálogo.
elementos.dialogoExclusao.addEventListener("close", async () => {
  if (elementos.dialogoExclusao.returnValue !== "confirm" || idPendenteExclusao === null) {
    idPendenteExclusao = null;
    return;
  }

  const idProduto = idPendenteExclusao;
  idPendenteExclusao = null;

  try {
    await requisitarApi(`${URL_API}/${idProduto}`, { method: "DELETE" });
    if (Number(elementos.id.value) === idProduto) limparFormulario();
    mostrarAviso("Produto excluído com sucesso.");
    await carregarProdutos();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  }
});

// ETAPA 10: Eventos auxiliares da interface e carregamento inicial.
elementos.confirmarExclusao.addEventListener("click", () => {
  elementos.dialogoExclusao.returnValue = "confirm";
});

elementos.imagem.addEventListener("input", renderizarPrevia);
elementos.busca.addEventListener("input", renderizarProdutos);
elementos.botaoCancelar.addEventListener("click", () => limparFormulario());
elementos.botaoNovoProduto.addEventListener("click", () => limparFormulario({ focar: true }));

limparFormulario();
carregarProdutos();
