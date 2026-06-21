const API_URL = "/api/products?available=1";
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const headerButton = document.querySelector(".navbar > .btn-small");
const productGrid = document.querySelector("#product-grid");
const flavorOptions = document.querySelector("#flavor-options");
const summaryList = document.querySelector("#summary-list");
const summaryTotal = document.querySelector("#summary-total");
const finishOrder = document.querySelector("#finish-order");
const formMessage = document.querySelector("#form-message");

menuButton.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  headerButton.classList.toggle("is-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navLinks.addEventListener("click", (event) => {
  if (event.target.tagName === "A") {
    navLinks.classList.remove("is-open");
    headerButton.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll('a[href="#inicio"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", window.location.pathname);
  });
});

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderProductCards(products) {
  productGrid.replaceChildren();
  if (!products.length) {
    productGrid.append(createElement("p", "loading-state", "Nenhum sabor disponível no momento."));
    return;
  }

  products.forEach((product) => {
    const card = createElement("article", "product-card");
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = `Milk-shake ${product.name}`;
    image.addEventListener("error", () => {
      image.src = "img/milkshake-hero.png";
    }, { once: true });

    const info = createElement("div", "product-info");
    info.append(createElement("h3", "", product.name));
    info.append(createElement("p", "", product.description));
    info.append(createElement("strong", "", currency.format(product.price)));
    card.append(image, info);
    productGrid.append(card);
  });
}

function shortDescription(description) {
  const normalized = description.replace(/^Milk-shake de\s*/i, "");
  return normalized.length > 52 ? `${normalized.slice(0, 49).trim()}...` : normalized;
}

function createQuantityControl(name) {
  const control = createElement("div", "quantity-control");
  const remove = createElement("button", "qty-btn", "-");
  remove.type = "button";
  remove.dataset.action = "remove";
  remove.setAttribute("aria-label", `Remover ${name}`);

  const quantity = createElement("span", "", "0");
  quantity.dataset.qty = "";

  const add = createElement("button", "qty-btn", "+");
  add.type = "button";
  add.dataset.action = "add";
  add.setAttribute("aria-label", `Adicionar ${name}`);
  control.append(remove, quantity, add);
  return control;
}

function renderFlavorOptions(products) {
  flavorOptions.replaceChildren();
  if (!products.length) {
    flavorOptions.append(createElement("p", "loading-state", "Nenhum sabor disponível para pedidos."));
    return;
  }

  products.forEach((product) => {
    const option = createElement("article", "order-option");
    option.dataset.id = `product-${product.id}`;
    option.dataset.price = product.price;
    option.dataset.qty = "0";
    option.dataset.kind = "flavor";

    const copy = document.createElement("div");
    copy.append(createElement("strong", "", product.name));
    copy.append(createElement("span", "", shortDescription(product.description)));
    option.append(copy, createQuantityControl(product.name));
    flavorOptions.append(option);
  });
}

function getOrderOptions() {
  return [...document.querySelectorAll(".order-option")];
}

function updateSummary() {
  let total = 0;
  const selectedItems = [];

  getOrderOptions().forEach((option) => {
    const quantity = Number(option.dataset.qty || 0);
    const price = Number(option.dataset.price);
    const name = option.querySelector("strong").textContent;
    option.querySelector("[data-qty]").textContent = quantity;
    option.classList.toggle("is-selected", quantity > 0);

    if (quantity > 0) {
      total += quantity * price;
      selectedItems.push({ name, quantity, subtotal: quantity * price });
    }
  });

  summaryList.replaceChildren();
  if (!selectedItems.length) {
    summaryList.append(createElement("p", "", "Nenhum item selecionado ainda."));
  } else {
    selectedItems.forEach((item) => {
      const row = createElement("div", "summary-item");
      row.append(
        createElement("span", "", `${item.quantity}x ${item.name}`),
        createElement("span", "", currency.format(item.subtotal))
      );
      summaryList.append(row);
    });
  }

  summaryTotal.textContent = currency.format(total);
}

document.querySelector(".order-builder").addEventListener("click", (event) => {
  const button = event.target.closest(".qty-btn");
  if (!button) return;
  const option = button.closest(".order-option");
  const currentQuantity = Number(option.dataset.qty || 0);
  option.dataset.qty = String(button.dataset.action === "add" ? currentQuantity + 1 : Math.max(0, currentQuantity - 1));
  formMessage.textContent = "";
  updateSummary();
});

finishOrder.addEventListener("click", () => {
  const hasFlavor = getOrderOptions().some((option) => option.dataset.kind === "flavor" && Number(option.dataset.qty || 0) > 0);
  formMessage.textContent = hasFlavor
    ? `Pedido finalizado com sucesso! Total: ${summaryTotal.textContent}.`
    : "Adicione pelo menos um sabor para finalizar seu pedido.";
});

async function loadProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Não foi possível carregar os produtos.");
    const products = await response.json();
    renderProductCards(products);
    renderFlavorOptions(products);
    updateSummary();
  } catch (error) {
    const message = "Não foi possível carregar o cardápio. Inicie o projeto com npm start.";
    productGrid.replaceChildren(createElement("p", "loading-state error-state", message));
    flavorOptions.replaceChildren(createElement("p", "loading-state error-state", message));
    console.error(error);
  }
}

document.querySelectorAll(".toppings-panel .order-option").forEach((option) => {
  option.dataset.qty = "0";
  option.dataset.kind = "topping";
});

updateSummary();
loadProducts();
