const products = [
  {
    id: 1,
    name: "Ethiopian Coffee",
    category: "Coffee",
    price: 20.00,
    vatRate: 6,
    weightKg: 1,
    emoji: "☕",
    note: "1 kg bag"
  },
  {
    id: 2,
    name: "White Teff Flour",
    category: "Flour",
    price: 22.00,
    vatRate: 6,
    weightKg: 5,
    emoji: "🌾",
    note: "5 kg bag"
  },
  {
    id: 3,
    name: "Brown Teff Flour",
    category: "Flour",
    price: 20.00,
    vatRate: 6,
    weightKg: 5,
    emoji: "🌾",
    note: "5 kg bag"
  },
  {
    id: 4,
    name: "Berbere",
    category: "Spices",
    price: 25.00,
    vatRate: 6,
    weightKg: 1,
    emoji: "🌶️",
    note: "1 kg"
  },
  {
    id: 5,
    name: "Shiro",
    category: "Spices",
    price: 15.00,
    vatRate: 6,
    weightKg: 1,
    emoji: "🫘",
    note: "1 kg"
  },
  {
    id: 6,
    name: "Habesha Beer",
    category: "Drinks",
    price: 3.00,
    vatRate: 21,
    weightKg: 1,
    emoji: "🍺",
    note: "Per bottle"
  },
  {
    id: 7,
    name: "Asmera Beer",
    category: "Drinks",
    price: 3.00,
    vatRate: 21,
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
const navetteRates = { Brussels: 13, Flanders: 15, Wallonia: 19 };
const euNationalNumberLengths = {
  AT: [7, 13], BE: [8, 9], BG: [7, 9], HR: [8, 9], CY: [8, 8],
  CZ: [9, 9], DK: [8, 8], EE: [7, 8], FI: [5, 12], FR: [9, 9],
  DE: [5, 11], GR: [10, 10], HU: [8, 9], IE: [7, 9], IT: [6, 11],
  LV: [8, 8], LT: [8, 8], LU: [4, 11], MT: [8, 8], NL: [9, 9],
  PL: [9, 9], PT: [9, 9], RO: [9, 9], SK: [9, 9], SI: [8, 8],
  ES: [9, 9], SE: [7, 10]
};

let selectedCategory = "All";

const money = value =>
  new Intl.NumberFormat("en-BE", {
    style: "currency",
    currency: "EUR"
  }).format(value);

function calculateVatSummary(items, shippingCents) {
  const netByRate = new Map();

  items.forEach(item => {
    const rate = item.vatRate;
    const lineCents = Math.round(item.price * 100) * item.qty;
    netByRate.set(rate, (netByRate.get(rate) || 0) + lineCents);
  });

  const netItemsCents = [...netByRate.values()].reduce((sum, value) => sum + value, 0);
  const rates = [...netByRate.keys()].sort((left, right) => left - right);
  let remainingShipping = shippingCents;
  let vatCents = 0;
  const breakdown = [];

  rates.forEach((rate, index) => {
    const netCents = netByRate.get(rate);
    const allocatedShipping = index === rates.length - 1
      ? remainingShipping
      : Math.round(shippingCents * netCents / netItemsCents);
    remainingShipping -= allocatedShipping;
    const taxBase = netCents + allocatedShipping;
    const rateVatCents = Math.round(taxBase * rate / 100);
    vatCents += rateVatCents;
    breakdown.push({ rate, taxBase, vatCents: rateVatCents });
  });

  return { netItemsCents, shippingCents, vatCents, breakdown };
}

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
          <small>Qty: ${item.qty} · ${money(item.price)} each excl. VAT</small>
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

  const region = getBelgianRegion(
    document.querySelector("#delivery-postcode").value.trim()
  );
  const shipping = region ? navetteRates[region] : null;
  const heavyParcelSupplement = parcelWeight > 20 ? 4 : 0;

  document.querySelector("#cart-total").textContent = cart.length
    ? `Products subtotal (excl. VAT): ${money(subtotal)}`
    : `Product subtotal: ${money(subtotal)}`;

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
    <p>Choose a Belgian postcode during checkout to calculate delivery and VAT. Orders placed today are dispatched from our shop the next day.</p>
  `;
  } else {
    const deliveryTotal = shipping + heavyParcelSupplement;
    const tax = calculateVatSummary(cart, Math.round(deliveryTotal * 100));
    shippingDetails.innerHTML = `
      <p>Estimated parcel weight: ${parcelWeight.toFixed(2)} kg</p>
      <p>Standard car delivery (${region}, before VAT): ${money(shipping)}</p>
      <p>Orders placed today are dispatched from our shop the next day.</p>
      ${heavyParcelSupplement ? `<p>Over 20 kg supplement: ${money(heavyParcelSupplement)}</p>` : ""}
      <p>Products subtotal before VAT: ${money(tax.netItemsCents / 100)}</p>
      <p>Delivery before VAT: ${money(tax.shippingCents / 100)}</p>
      ${tax.breakdown.map(line => `<p>VAT ${line.rate}%: ${money(line.vatCents / 100)}</p>`).join("")}
      <p><strong>Total including VAT: ${money((tax.netItemsCents + tax.shippingCents + tax.vatCents) / 100)}</strong></p>
      <p>Each additional parcel to the same address adds €4 and is not included here.</p>
      <p>Totals exclude any monthly fuel surcharge or tolls.</p>
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


const checkoutButton = document.querySelector("#checkout-button");
const checkoutForm = document.querySelector("#checkout-form");
const backToCartButton = document.querySelector("#back-to-cart");
const cartItemsContainer = document.querySelector("#cart-items");

checkoutButton.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Your cart is empty. Please add a product first.");
    return;
  }

  checkoutButton.hidden = true;
  checkoutForm.hidden = false;
  cartItemsContainer.hidden = true;

  checkoutForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

backToCartButton.addEventListener("click", () => {
  checkoutForm.hidden = true;
  checkoutButton.hidden = false;
  cartItemsContainer.hidden = false;
});


const phoneInput = document.querySelector("#customer-phone");
const phoneCountry = document.querySelector("#phone-country");
const firstNameInput = document.querySelector("#customer-first-name");
const lastNameInput = document.querySelector("#customer-last-name");
const postcodeInput = document.querySelector("#delivery-postcode");
const cityInput = document.querySelector("#delivery-city");
const deliveryRegion = document.querySelector("#delivery-region");
const checkoutStatus = document.querySelector("#checkout-status");
const apiBaseUrl = String(window.GHERALTA_API_BASE_URL || "").replace(/\/$/, "");
const belgianPostcodes = window.BELGIAN_POSTCODES;

function validateName(input, label) {
  const value = input.value.trim();
  const validName = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(value);
  const valid = value.length >= 1 && value.length <= 50 && validName;

  input.setCustomValidity(
    !value && !input.value
      ? ""
      : valid
        ? ""
        : `Enter a valid ${label} using letters, spaces, apostrophes, or hyphens (up to 50 characters).`
  );
}

function validateCustomerNames() {
  validateName(firstNameInput, "first name");
  validateName(lastNameInput, "last name");
}

function getBelgianRegion(postcode) {
  return belgianPostcodes[postcode]?.region || "";
}

function validateBelgianAddress() {
  const postcode = postcodeInput.value;
  const address = belgianPostcodes[postcode];
  const region = address?.region || "";
  const cityMatches = address?.cities.some(city => city.value === cityInput.value) || false;

  postcodeInput.setCustomValidity(
    postcode && !address ? "Choose a valid Belgian postcode from the list." : ""
  );
  cityInput.setCustomValidity(
    cityInput.value && !cityMatches
      ? "Choose a city or municipality listed for this postcode."
      : ""
  );

  if (!address) {
    deliveryRegion.textContent = "Choose a postcode to see its matching city and delivery region.";
  } else if (!cityMatches) {
    const availableCities = address.cities.map(city => city.label).join(", ");
    deliveryRegion.textContent = `Postcode ${postcode} matches: ${availableCities} (${region}). Choose a matching city.`;
  } else {
    const selectedCity = address.cities.find(city => city.value === cityInput.value);
    deliveryRegion.textContent =
      `Address match: ${postcode} — ${selectedCity.label} (${region}). ` +
      `Standard car delivery: ${money(navetteRates[region])}. ` +
      "Orders placed today are dispatched from our shop the next day.";
  }

  return region;
}

function populatePostcodes() {
  Object.keys(belgianPostcodes).sort().forEach(postcode => {
    postcodeInput.add(new Option(postcode, postcode));
  });
}

function populateCitiesForPostcode() {
  const address = belgianPostcodes[postcodeInput.value];
  cityInput.replaceChildren(new Option(
    address ? "Choose a city or municipality" : "Choose a postcode first",
    ""
  ));
  cityInput.disabled = !address;

  if (address) {
    address.cities.forEach(city => {
      cityInput.add(new Option(city.label, city.value));
    });

    if (address.cities.length === 1) {
      cityInput.value = address.cities[0].value;
    }
  }

  validateBelgianAddress();
  renderCart();
}

function validatePhoneNumber() {
  const selectedOption = phoneCountry.selectedOptions[0];
  const dialCode = selectedOption.dataset.dial;
  const countryName = selectedOption.textContent.split(" (+")[0];
  const raw = phoneInput.value.trim();
  const isInternational = raw.startsWith("+") || raw.startsWith("00");
  const validCharacters = /^\+?[0-9\s()./-]+$/.test(raw) || /^00[0-9\s()./-]+$/.test(raw);
  let digits = raw.replace(/\D/g, "");

  if (raw.startsWith("00")) digits = digits.slice(2);

  let nationalNumber = digits;
  let matchesCountry = true;

  if (isInternational) {
    matchesCountry = digits.startsWith(dialCode);
    nationalNumber = matchesCountry ? digits.slice(dialCode.length) : "";
  }

  // Most EU numbering plans use a leading 0 only in national format.
  // Italy keeps its 0 as part of the international number.
  if (selectedOption.value !== "IT" && nationalNumber.startsWith("0")) {
    nationalNumber = nationalNumber.slice(1);
  }

  const totalDigits = dialCode.length + nationalNumber.length;
  const [minLength, maxLength] = euNationalNumberLengths[selectedOption.value];
  const valid = validCharacters && matchesCountry &&
    nationalNumber.length >= minLength && nationalNumber.length <= maxLength &&
    totalDigits <= 15;

  phoneInput.setCustomValidity(
    valid
      ? ""
      : `Enter a valid ${countryName} number, either local or with +${dialCode}.`
  );
}

phoneInput.addEventListener("input", validatePhoneNumber);
phoneCountry.addEventListener("change", validatePhoneNumber);
firstNameInput.addEventListener("input", () => validateName(firstNameInput, "first name"));
lastNameInput.addEventListener("input", () => validateName(lastNameInput, "last name"));
postcodeInput.addEventListener("change", populateCitiesForPostcode);
cityInput.addEventListener("change", () => {
  validateBelgianAddress();
  renderCart();
});

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();

  validateCustomerNames();
  validatePhoneNumber();
  validateBelgianAddress();

  if (!checkoutForm.reportValidity()) {
    return;
  }

  if (!apiBaseUrl) {
    checkoutStatus.textContent = "Secure checkout is not connected yet. Your details have not been submitted.";
    return;
  }

  const submitButton = checkoutForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  checkoutStatus.textContent = "Creating your secure payment session…";

  try {
    const response = await fetch(`${apiBaseUrl}/api/create-payment.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerFirstName: firstNameInput.value.trim(),
        customerLastName: lastNameInput.value.trim(),
        customerEmail: document.querySelector("#customer-email").value.trim(),
        customerPhone: phoneInput.value.trim(),
        phoneCountry: phoneCountry.value,
        deliveryPostcode: postcodeInput.value,
        deliveryCity: cityInput.value,
        deliveryStreet: document.querySelector("#delivery-street").value.trim(),
        deliveryBox: document.querySelector("#delivery-box").value.trim(),
        deliveryInstructions: document.querySelector("#delivery-instructions").value.trim(),
        items: cart.map(item => ({ id: item.id, qty: item.qty }))
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.checkoutUrl !== "string") {
      throw new Error(result.error || "Secure checkout could not be started.");
    }

    const checkoutUrl = new URL(result.checkoutUrl);
    if (checkoutUrl.protocol !== "https:" || !/(^|\.)mollie\.com$/i.test(checkoutUrl.hostname)) {
      throw new Error("The payment provider returned an invalid checkout link.");
    }

    checkoutStatus.textContent = `Order ${result.orderReference} is ready. Redirecting to Mollie…`;
    window.location.assign(checkoutUrl.href);
  } catch (error) {
    checkoutStatus.textContent = error instanceof Error
      ? error.message
      : "Secure checkout could not be started. Please try again.";
    submitButton.disabled = false;
  }
});


populatePostcodes();
document.querySelector("#year").textContent = new Date().getFullYear();

renderProducts();
renderCart();
