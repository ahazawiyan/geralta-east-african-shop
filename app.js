
const products = [
  {
    id: 1,
    name: "Ethiopian Coffee",
    category: "Coffee",
    price: 20.00,
    weightKg: 1,
    emoji: "☕",
    note: "1 kg bag"
  },
  {
    id: 2,
    name: "White Teff Flour",
    category: "Flour",
    price: 22.00,
    weightKg: 5,
    emoji: "🌾",
    note: "5 kg bag"
  },
  {
    id: 3,
    name: "Brown Teff Flour",
    category: "Flour",
    price: 20.00,
    weightKg: 5,
    emoji: "🌾",
    note: "5 kg bag"
  },
  {
    id: 4,
    name: "Berbere",
    category: "Spices",
    price: 25.00,
    weightKg: 1,
    emoji: "🌶️",
    note: "1 kg"
  },
  {
    id: 5,
    name: "Shiro",
    category: "Spices",
    price: 15.00,
    weightKg: 1,
    emoji: "🫘",
    note: "1 kg"
  },
  {
    id: 6,
    name: "Habesha Beer",
    category: "Drinks",
    price: 3.00,
    weightKg: 1,
    emoji: "🍺",
    note: "Per bottle"
  },
  {
    id: 7,
    name: "Asmera Beer",
    category: "Drinks",
    price: 3.00,
    weightKg: 1,
    emoji: "🍺",
    note: "Per bottle"
  }
];

const grid = document.querySelector("#product-grid");
const filters = document.querySelector("#category-filters");
const searchInput = document.querySelector("#product-search");
const searchResults = document.querySelector("#search-results");
const cart = [];

let selectedCategory = "All";

const money = value =>
  new Intl.NumberFormat("en-BE", {
    style: "currency",
    currency: "EUR"
  }).format(value);

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();

  const visible = products.filter(product => {
    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    const searchableText =
      `${product.name} ${product.category} ${product.note}`.toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  if (visible.length === 0) {
    grid.innerHTML = `
      <p class="no-products">
        No products found. Try another search.
      </p>`;
  } else {
    grid.innerHTML = visible.map(product => `
      <article class="product-card">
        <div class="product-art">
          <span class="product-number">${product.category}</span>
          <span class="product-emoji" aria-hidden="true">${product.emoji}</span>
        </div>
        <div class="product-info">
          <span class="product-category">${product.note}</span>
          <h3>${product.name}</h3>
          <div class="product-bottom">
            <span class="price">${money(product.price)}</span>
            <button class="add-button" data-add="${product.id}">
              Add to cart +
            </button>
          </div>
        </div>
      </article>
    `).join("");
  }

  searchResults.textContent =
    `${visible.length} product${visible.length === 1 ? "" : "s"} found`;
}


function renderCart() {
  document.querySelector("#cart-count").textContent =
    cart.reduce((sum, item) => sum + item.qty, 0);

  const target = document.querySelector("#cart-items");

  if (!cart.length) {
    target.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
  } else {
    target.innerHTML = cart.map(item => `
      <div class="cart-row">
        <div>
          <strong>${item.name}</strong>
          <small>Qty: ${item.qty} · ${money(item.price)} each</small>
        </div>
        <div>
          <strong>${money(item.price * item.qty)}</strong><br>
          <button class="remove-button" data-remove="${item.id}">
            Remove one
          </button>
        </div>
      </div>
    `).join("");
  }

  // Calculate product subtotal and total product weight.
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty, 0
  );

  const productWeight = cart.reduce(
    (sum, item) => sum + item.weightKg * item.qty, 0
  );

  // Temporary allowance for packaging.
  const packagingWeight = cart.length > 0 ? 0.5 : 0;
  const parcelWeight = productWeight + packagingWeight;

  // Provisional shipping rates.
  let shipping = 0;

  if (cart.length > 0) {
    if (parcelWeight <= 2) {
      shipping = 8.50;
    } else if (parcelWeight <= 5) {
      shipping = 9.00;
    } else if (parcelWeight <= 10) {
      shipping = 10.00;
    } else if (parcelWeight <= 20) {
      shipping = 12.50;
    } else {
      shipping = null;
    }
  }

  document.querySelector("#cart-total").textContent =
    money(subtotal + (shipping ?? 0));

  // Show shipping details below the existing cart total.
  let shippingDetails = document.querySelector("#shipping-details");

  if (!shippingDetails) {
    shippingDetails = document.createElement("div");
    shippingDetails.id = "shipping-details";

    document.querySelector("#cart-total").insertAdjacentElement(
      "afterend",
      shippingDetails
    );
  }

  if (cart.length === 0) {
    shippingDetails.innerHTML = "";
  } else if (shipping === null) {
    shippingDetails.innerHTML = `
      <p>Estimated parcel weight: ${parcelWeight.toFixed(2)} kg</p>
      <p>Shipping: Manual quote required for parcels over 20 kg.</p>
      <p><strong>Final total: Please contact us for a delivery quote.</strong></p>
    `;
  } else {
    shippingDetails.innerHTML = `
      <p>Product subtotal: ${money(subtotal)}</p>
      <p>Estimated parcel weight: ${parcelWeight.toFixed(2)} kg</p>
      <p>Shipping: ${money(shipping)}</p>
      <p><strong>Total including shipping: ${money(subtotal + shipping)}</strong></p>
    `;
  }
}


filters.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  selectedCategory = button.dataset.category;

  filters.querySelectorAll(".filter").forEach(element => {
    element.classList.toggle("active", element === button);
  });

  renderProducts();
});

searchInput.addEventListener("input", renderProducts);

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (!button) return;

  const product = products.find(
    item => item.id === Number(button.dataset.add)
  );

  if (!product) return;

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();

  button.textContent = "Added ✓";

  setTimeout(() => {
    if (button.isConnected) {
      button.textContent = "Add to cart +";
    }
  }, 900);
});

document.querySelector("#cart-items").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;

  const index = cart.findIndex(
    item => item.id === Number(button.dataset.remove)
  );

  if (index >= 0) {
    if (cart[index].qty > 1) {
      cart[index].qty--;
    } else {
      cart.splice(index, 1);
    }
  }

  renderCart();
});

function setCartOpen(open) {
  document.querySelector("#cart-panel").hidden = !open;
  document.querySelector("#cart-backdrop").hidden = !open;
}

document.querySelector("#cart-toggle").addEventListener("click", () => {
  setCartOpen(true);
});

document.querySelector("#cart-close").addEventListener("click", () => {
  setCartOpen(false);
});

document.querySelector("#cart-backdrop").addEventListener("click", () => {
  setCartOpen(false);
});

document.querySelector("#checkout-button").addEventListener("click", () => {
  alert(
    "Demo checkout only. Real payments and delivery will be added later."
  );
});

document.querySelector("#year").textContent = new Date().getFullYear();

renderProducts();
renderCart();
