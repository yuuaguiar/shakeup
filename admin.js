const API_URL = "/api/products";
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const elements = {
  form: document.querySelector("#product-form"),
  id: document.querySelector("#product-id"),
  name: document.querySelector("#product-name"),
  category: document.querySelector("#product-category"),
  price: document.querySelector("#product-price"),
  description: document.querySelector("#product-description"),
  image: document.querySelector("#product-image"),
  available: document.querySelector("#product-available"),
  preview: document.querySelector("#image-preview"),
  formKicker: document.querySelector("#form-kicker"),
  formTitle: document.querySelector("#form-title"),
  submit: document.querySelector("#submit-product"),
  cancel: document.querySelector("#cancel-edit"),
  newProduct: document.querySelector("#new-product"),
  list: document.querySelector("#admin-product-list"),
  search: document.querySelector("#product-search"),
  total: document.querySelector("#stat-total"),
  availableTotal: document.querySelector("#stat-available"),
  unavailableTotal: document.querySelector("#stat-unavailable"),
  toast: document.querySelector("#toast"),
  deleteDialog: document.querySelector("#delete-dialog"),
  deleteMessage: document.querySelector("#delete-message"),
  confirmDelete: document.querySelector("#confirm-delete"),
};

let products = [];
let pendingDeleteId = null;
let toastTimer = null;

function showToast(message, type = "success") {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", type === "error");
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 3200);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const details = payload?.errors?.join(" ");
    throw new Error(details || payload?.message || "Não foi possível concluir a operação.");
  }
  return payload;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function updateStats() {
  const available = products.filter((product) => product.available).length;
  elements.total.textContent = products.length;
  elements.availableTotal.textContent = available;
  elements.unavailableTotal.textContent = products.length - available;
}

function buildProductRow(product) {
  const row = createElement("article", "admin-product-row");
  row.dataset.id = product.id;

  const image = document.createElement("img");
  image.src = product.image;
  image.alt = `Foto de ${product.name}`;
  image.addEventListener("error", () => {
    image.src = "img/milkshake-hero.png";
  }, { once: true });

  const main = createElement("div", "product-main");
  main.append(createElement("h3", "", product.name));
  main.append(createElement("p", "", product.description));

  const meta = createElement("div", "product-meta");
  meta.append(createElement("strong", "", currency.format(product.price)));
  meta.append(createElement("span", "", product.category));
  meta.append(createElement("span", `status-badge${product.available ? "" : " off"}`, product.available ? "Disponível" : "Indisponível"));
  main.append(meta);

  const actions = createElement("div", "row-actions");
  const editButton = createElement("button", "row-action", "Editar");
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.dataset.id = product.id;

  const deleteButton = createElement("button", "row-action danger", "Excluir");
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = product.id;
  actions.append(editButton, deleteButton);

  row.append(image, main, actions);
  return row;
}

function renderProducts() {
  const term = elements.search.value.trim().toLocaleLowerCase("pt-BR");
  const filtered = products.filter((product) => {
    const haystack = `${product.name} ${product.category}`.toLocaleLowerCase("pt-BR");
    return haystack.includes(term);
  });

  elements.list.replaceChildren();
  if (!filtered.length) {
    elements.list.append(createElement("p", "empty-state", term ? "Nenhum produto encontrado para essa busca." : "Nenhum produto cadastrado."));
    return;
  }

  filtered.forEach((product) => elements.list.append(buildProductRow(product)));
}

async function loadProducts() {
  elements.list.innerHTML = '<p class="empty-state">Carregando produtos...</p>';
  try {
    products = await apiRequest(API_URL);
    updateStats();
    renderProducts();
  } catch (error) {
    elements.list.innerHTML = '<p class="empty-state">Não foi possível carregar o cardápio.</p>';
    showToast(error.message, "error");
  }
}

function renderPreview() {
  const source = elements.image.value.trim();
  elements.preview.replaceChildren();
  if (!source) {
    elements.preview.append(createElement("span", "", "A prévia da imagem aparecerá aqui."));
    return;
  }

  const image = document.createElement("img");
  image.src = source;
  image.alt = "Prévia do produto";
  image.addEventListener("error", () => {
    elements.preview.replaceChildren(createElement("span", "", "Não foi possível carregar essa imagem."));
  }, { once: true });
  elements.preview.append(image);
}

function resetForm({ focus = false } = {}) {
  elements.form.reset();
  elements.id.value = "";
  elements.available.checked = true;
  elements.formKicker.textContent = "Novo cadastro";
  elements.formTitle.textContent = "Adicionar produto";
  elements.submit.textContent = "Cadastrar produto";
  renderPreview();
  if (focus) {
    document.querySelector("#form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    elements.name.focus({ preventScroll: true });
  }
}

function editProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  elements.id.value = product.id;
  elements.name.value = product.name;
  elements.category.value = product.category;
  elements.price.value = product.price.toFixed(2);
  elements.description.value = product.description;
  elements.image.value = product.image;
  elements.available.checked = product.available;
  elements.formKicker.textContent = `Editando produto #${product.id}`;
  elements.formTitle.textContent = product.name;
  elements.submit.textContent = "Salvar alterações";
  renderPreview();
  document.querySelector("#form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function requestDelete(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  pendingDeleteId = id;
  elements.deleteMessage.textContent = `“${product.name}” será removido do banco de dados, da landing page e do montador de pedido.`;
  elements.deleteDialog.showModal();
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;

  const id = Number(elements.id.value);
  const isEditing = Boolean(id);
  const product = {
    name: elements.name.value,
    category: elements.category.value,
    price: Number(elements.price.value),
    description: elements.description.value,
    image: elements.image.value,
    available: elements.available.checked,
  };

  elements.submit.disabled = true;
  elements.submit.textContent = isEditing ? "Salvando..." : "Cadastrando...";

  try {
    await apiRequest(isEditing ? `${API_URL}/${id}` : API_URL, {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(product),
    });
    showToast(isEditing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
    resetForm();
    await loadProducts();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.submit.disabled = false;
    if (!elements.id.value) elements.submit.textContent = "Cadastrar produto";
  }
});

elements.list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") editProduct(id);
  if (button.dataset.action === "delete") requestDelete(id);
});

elements.deleteDialog.addEventListener("close", async () => {
  if (elements.deleteDialog.returnValue !== "confirm" || pendingDeleteId === null) {
    pendingDeleteId = null;
    return;
  }

  const id = pendingDeleteId;
  pendingDeleteId = null;
  try {
    await apiRequest(`${API_URL}/${id}`, { method: "DELETE" });
    if (Number(elements.id.value) === id) resetForm();
    showToast("Produto excluído com sucesso.");
    await loadProducts();
  } catch (error) {
    showToast(error.message, "error");
  }
});

elements.confirmDelete.addEventListener("click", () => {
  elements.deleteDialog.returnValue = "confirm";
});

elements.image.addEventListener("input", renderPreview);
elements.search.addEventListener("input", renderProducts);
elements.cancel.addEventListener("click", () => resetForm());
elements.newProduct.addEventListener("click", () => resetForm({ focus: true }));

resetForm();
loadProducts();
