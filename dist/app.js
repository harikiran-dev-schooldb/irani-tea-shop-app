const products = [
  { id: "masala", name: "Masala Chai", price: 45, category: "chai", emoji: "☕", color: "#edc56f", description: "Bold Assam tea with ginger, cardamom and warming spices." },
  { id: "elaichi", name: "Elaichi Chai", price: 50, category: "chai", emoji: "🫖", color: "#d9e0ba", description: "Fragrant green cardamom, slow-simmered with milk tea." },
  { id: "cutting", name: "Mumbai Cutting", price: 30, category: "chai", emoji: "🥃", color: "#f1b598", description: "A short, strong and sweet glass of proper street-style chai." },
  { id: "kashmiri", name: "Kashmiri Kahwa", price: 70, category: "chai", emoji: "🍵", color: "#c7d79c", description: "Light green tea with saffron, cinnamon and almonds." },
  { id: "lemon", name: "Iced Lemon Tea", price: 80, category: "coolers", emoji: "🧋", color: "#f0d87e", description: "Black tea, fresh lemon and mint poured over ice." },
  { id: "rose", name: "Rose Milk Chai", price: 90, category: "coolers", emoji: "🥤", color: "#eeb7af", description: "Chilled milk tea with a delicate rose finish." },
  { id: "samosa", name: "Classic Samosa", price: 35, category: "bites", emoji: "🥟", color: "#e8c078", description: "Crisp pastry packed with spiced potato and peas." },
  { id: "bun", name: "Bun Maska", price: 55, category: "bites", emoji: "🥖", color: "#e6c9a2", description: "Soft toasted bun with a generous swipe of salted butter." }
];

const state = { cart: [], selected: null };
const grid = document.querySelector("[data-menu-grid]");
const dialog = document.querySelector("[data-dialog]");
const form = document.querySelector("[data-customize-form]");
const toast = document.querySelector("[data-toast]");

function money(value) { return `₹${value}`; }

function renderMenu() {
  grid.innerHTML = products.map((item) => `
    <article class="menu-card" data-category="${item.category}">
      <div class="product-art" style="--art-bg:${item.color}"><span class="emoji" aria-hidden="true">${item.emoji}</span></div>
      <div class="product-meta"><h3>${item.name}</h3><span class="price">${money(item.price)}</span></div>
      <p>${item.description}</p>
      <button class="order-item" type="button" data-add="${item.id}"><span>Add to order</span><span aria-hidden="true">+</span></button>
    </article>`).join("");
}

function openCustomizer(item) {
  state.selected = item;
  form.reset();
  document.querySelector("[data-dialog-title]").textContent = item.name;
  document.querySelector("[data-dialog-description]").textContent = item.description;
  document.querySelector("[data-dialog-price]").textContent = money(item.price);
  const visual = document.querySelector("[data-dialog-visual]");
  visual.textContent = item.emoji;
  visual.style.background = item.color;
  if (item.category === "bites") {
    form.querySelectorAll("fieldset").forEach((field) => field.hidden = true);
  } else {
    form.querySelectorAll("fieldset").forEach((field) => field.hidden = false);
  }
  dialog.showModal();
}

function renderCart() {
  const items = document.querySelector("[data-cart-items]");
  const empty = document.querySelector("[data-empty-cart]");
  const checkout = document.querySelector("[data-checkout]");
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  document.querySelector("[data-cart-count]").textContent = state.cart.length;
  document.querySelector("[data-total]").textContent = money(total);
  empty.hidden = state.cart.length > 0;
  checkout.hidden = state.cart.length === 0;
  items.innerHTML = state.cart.map((item, index) => `
    <div class="cart-row">
      <div><h3>${item.name}</h3><p>${item.options}</p><button type="button" data-remove="${index}">Remove</button></div>
      <strong>${money(item.price)}</strong>
    </div>`).join("");
}

function openCart() {
  document.querySelector("[data-backdrop]").hidden = false;
  document.querySelector("[data-cart]").classList.add("open");
  document.querySelector("[data-cart]").setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  document.querySelector("[data-backdrop]").hidden = true;
  document.querySelector("[data-cart]").classList.remove("open");
  document.querySelector("[data-cart]").setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

document.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add]");
  const remove = event.target.closest("[data-remove]");
  const filter = event.target.closest("[data-filter]");
  if (add) openCustomizer(products.find((item) => item.id === add.dataset.add));
  if (remove) { state.cart.splice(Number(remove.dataset.remove), 1); renderCart(); }
  if (filter) {
    document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button === filter));
    document.querySelectorAll(".menu-card").forEach((card) => { card.hidden = filter.dataset.filter !== "all" && card.dataset.category !== filter.dataset.filter; });
  }
  if (event.target.closest("[data-open-cart]")) openCart();
  if (event.target.closest("[data-close-cart]") || event.target.matches("[data-backdrop]")) closeCart();
  if (event.target.closest("[data-close-dialog]")) dialog.close();
});

form.addEventListener("change", () => {
  const isLarge = new FormData(form).get("size") === "Large";
  document.querySelector("[data-dialog-price]").textContent = money(state.selected.price + (isLarge ? 20 : 0));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const isBite = state.selected.category === "bites";
  const size = isBite ? "One serving" : data.get("size");
  const sweetness = isBite ? "" : ` · ${data.get("sweetness")}`;
  state.cart.push({ name: state.selected.name, price: state.selected.price + (size === "Large" ? 20 : 0), options: `${size}${sweetness}` });
  renderCart();
  dialog.close();
  showToast(`${state.selected.name} added to your bag`);
});

document.querySelector("[data-checkout]").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name");
  state.cart = [];
  renderCart();
  closeCart();
  event.currentTarget.reset();
  showToast(`Thanks, ${name}! Your pickup order is confirmed.`);
});

dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) dialog.close();
});

document.querySelector("[data-year]").textContent = new Date().getFullYear();
renderMenu();
renderCart();
