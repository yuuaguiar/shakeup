const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const headerButton = document.querySelector(".navbar > .btn-small");
const orderOptions = document.querySelectorAll(".order-option");
const summaryList = document.querySelector("#summary-list");
const summaryTotal = document.querySelector("#summary-total");
const finishOrder = document.querySelector("#finish-order");
const formMessage = document.querySelector("#form-message");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

function updateSummary() {
  let total = 0;
  const selectedItems = [];

  orderOptions.forEach((option) => {
    const qty = Number(option.dataset.qty || 0);
    const price = Number(option.dataset.price);
    const name = option.querySelector("strong").textContent;
    const qtyLabel = option.querySelector("[data-qty]");

    qtyLabel.textContent = qty;
    option.classList.toggle("is-selected", qty > 0);

    if (qty > 0) {
      total += qty * price;
      selectedItems.push({ name, qty, subtotal: qty * price });
    }
  });

  if (selectedItems.length === 0) {
    summaryList.innerHTML = "<p>Nenhum item selecionado ainda.</p>";
  } else {
    summaryList.innerHTML = selectedItems
      .map((item) => `
        <div class="summary-item">
          <span>${item.qty}x ${item.name}</span>
          <span>${currency.format(item.subtotal)}</span>
        </div>
      `)
      .join("");
  }

  summaryTotal.textContent = currency.format(total);
}

orderOptions.forEach((option) => {
  option.dataset.qty = "0";

  option.addEventListener("click", (event) => {
    const button = event.target.closest(".qty-btn");

    if (!button) {
      return;
    }

    const currentQty = Number(option.dataset.qty || 0);
    const nextQty = button.dataset.action === "add"
      ? currentQty + 1
      : Math.max(0, currentQty - 1);

    option.dataset.qty = String(nextQty);
    formMessage.textContent = "";
    updateSummary();
  });
});

finishOrder.addEventListener("click", () => {
  const totalText = summaryTotal.textContent;
  const hasItems = [...orderOptions].some((option) => Number(option.dataset.qty || 0) > 0);

  formMessage.textContent = hasItems
    ? `Pedido finalizado com sucesso! Total: ${totalText}.`
    : "Adicione pelo menos um sabor para finalizar seu pedido.";
});

updateSummary();
