const products = [
  {id:1,name:"Hibiscus Herbal Tea",category:"Drinks",price:4.50,emoji:"🫖",note:"Tea & drinks"},
  {id:2,name:"Spiced Ginger Drink",category:"Drinks",price:3.50,emoji:"🥤",note:"Tea & drinks"},
  {id:3,name:"Berbere Spice Blend",category:"Spices",price:5.00,emoji:"🌶️",note:"Aromatic spices"},
  {id:4,name:"Mitmita Spice",category:"Spices",price:4.75,emoji:"🫙",note:"Aromatic spices"},
  {id:5,name:"Traditional Cotton Scarf",category:"Clothing",price:18.00,emoji:"🧣",note:"Clothing & textiles"},
  {id:6,name:"Woven Pattern Shirt",category:"Clothing",price:28.00,emoji:"👕",note:"Clothing & textiles"},
  {id:7,name:"Ethiopian Arabica Coffee",category:"Coffee",price:9.50,emoji:"☕",note:"Whole bean or ground"},
  {id:8,name:"Roasted Coffee Beans",category:"Coffee",price:11.00,emoji:"🫘",note:"Rich & aromatic"},
  {id:9,name:"Teff Flour",category:"Flour",price:7.00,emoji:"🌾",note:"Traditional grains"},
  {id:10,name:"Barley Flour",category:"Flour",price:4.50,emoji:"🥣",note:"Traditional grains"}
];
const grid = document.querySelector("#product-grid");
const filters = document.querySelector("#category-filters");
const cart = [];
const money = value => new Intl.NumberFormat("en-BE",{style:"currency",currency:"EUR"}).format(value);

function renderProducts(category="All") {
  const visible = category === "All" ? products : products.filter(p => p.category === category);
  grid.innerHTML = visible.map(p => `
    <article class="product-card">
      <div class="product-art"><span class="product-number">${p.category}</span><span class="product-emoji" aria-hidden="true">${p.emoji}</span></div>
      <div class="product-info">
        <span class="product-category">${p.note}</span>
        <h3>${p.name}</h3>
        <div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-button" data-add="${p.id}">Add to cart +</button></div>
      </div>
    </article>`).join("");
}
function renderCart() {
  document.querySelector("#cart-count").textContent = cart.reduce((sum,item)=>sum+item.qty,0);
  const target = document.querySelector("#cart-items");
  if (!cart.length) target.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
  else target.innerHTML = cart.map(item => `<div class="cart-row"><div><strong>${item.name}</strong><small>Qty: ${item.qty} · ${money(item.price)} each</small></div><div><strong>${money(item.price*item.qty)}</strong><br><button class="remove-button" data-remove="${item.id}">Remove one</button></div></div>`).join("");
  document.querySelector("#cart-total").textContent = money(cart.reduce((sum,item)=>sum+item.price*item.qty,0));
}
filters.addEventListener("click",event=>{
  const button = event.target.closest("[data-category]");
  if(!button)return;
  filters.querySelectorAll(".filter").forEach(el=>el.classList.toggle("active",el===button));
  renderProducts(button.dataset.category);
});
grid.addEventListener("click",event=>{
  const button = event.target.closest("[data-add]");
  if(!button)return;
  const product = products.find(p=>p.id===Number(button.dataset.add));
  const existing = cart.find(item=>item.id===product.id);
  if(existing)existing.qty++; else cart.push({...product,qty:1});
  renderCart();
  button.textContent = "Added ✓";
  setTimeout(()=>{if(button.isConnected)button.textContent="Add to cart +";},900);
});
document.querySelector("#cart-items").addEventListener("click",event=>{
  const button=event.target.closest("[data-remove]");
  if(!button)return;
  const index=cart.findIndex(item=>item.id===Number(button.dataset.remove));
  if(index>=0){if(cart[index].qty>1)cart[index].qty--;else cart.splice(index,1);}
  renderCart();
});
function setCartOpen(open){
  document.querySelector("#cart-panel").hidden=!open;
  document.querySelector("#cart-backdrop").hidden=!open;
}
document.querySelector("#cart-toggle").addEventListener("click",()=>setCartOpen(true));
document.querySelector("#cart-close").addEventListener("click",()=>setCartOpen(false));
document.querySelector("#cart-backdrop").addEventListener("click",()=>setCartOpen(false));
document.querySelector("#checkout-button").addEventListener("click",()=>alert("This is a learning demo. Real checkout, payment and delivery setup will be added later."));
document.querySelector("#year").textContent=new Date().getFullYear();
renderProducts();
renderCart();
