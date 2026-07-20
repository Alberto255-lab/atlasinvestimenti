const customerRaw = localStorage.getItem('atlas_customer');
if (!customerRaw) window.location.href = 'cliente.html';
const customer = JSON.parse(customerRaw || '{}');
document.getElementById('username-display').textContent = customer.nickname || 'Cliente';

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('atlas_customer');
  window.location.href = 'index.html';
});

const loadingEl = document.getElementById('products-loading');
const emptyEl = document.getElementById('products-empty');
const layoutEl = document.getElementById('shop-layout');
const sidebarNavEl = document.getElementById('sidebar-nav');
const sectionsEl = document.getElementById('shop-sections');

// Ordine fisso dei reparti (coerente con la home page)
const DEPARTMENTS = ['Investimenti', 'Edile', 'Informatica', 'Grafica', 'Legale', 'Editoriale'];

async function loadProducts() {
  const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
  loadingEl.classList.add('is-hidden');

  if (error || !data || data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  layoutEl.classList.remove('is-hidden');

  // Raggruppo i prodotti per reparto (categoria)
  const byDept = {};
  DEPARTMENTS.forEach(d => byDept[d] = []);
  data.forEach(p => {
    if (!byDept[p.category]) byDept[p.category] = [];
    byDept[p.category].push(p);
  });

  // Sidebar di navigazione
  sidebarNavEl.innerHTML = DEPARTMENTS.map(d => `<a href="#dept-${slug(d)}" class="sidebar-link" data-dept="${d}">${d}</a>`).join('');

  // Sezioni prodotti, una per reparto
  sectionsEl.innerHTML = DEPARTMENTS.map(dept => {
    const products = byDept[dept] || [];
    const content = products.length
      ? `<div class="products-grid">${products.map(productCardHtml).join('')}</div>`
      : `<div class="dept-section-empty">Nessun prodotto disponibile in questo reparto al momento.</div>`;
    return `
      <section class="dept-section" id="dept-${slug(dept)}">
        <h3 class="dept-section-title">${dept}</h3>
        ${content}
      </section>
    `;
  }).join('');

  data.forEach(p => {
    if (p.price_on_request) return; // bottone disabilitato, niente da collegare
    document.getElementById(`buy-${p.id}`)?.addEventListener('click', () => handleAddToCart(p));
  });

  // Click sidebar: scroll fluido alla sezione
  sidebarNavEl.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  setupScrollSpy();
}

function slug(text) {
  return text.toLowerCase().replace(/\s+/g, '-');
}

// Evidenzia nella sidebar la sezione attualmente visibile durante lo scroll
function setupScrollSpy() {
  const sections = document.querySelectorAll('.dept-section');
  const links = document.querySelectorAll('.sidebar-link');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
      }
    });
  }, { rootMargin: '-100px 0px -70% 0px' });
  sections.forEach(s => observer.observe(s));
}

function productCardHtml(p) {
  const image = p.image_url
    ? `<img src="${p.image_url}" alt="${p.name}" class="product-image" />`
    : `<div class="product-image-placeholder">📦</div>`;

  const priceBlock = p.price_on_request
    ? `<p class="product-price" style="font-size:0.95rem; color:var(--grey);">Prezzo da concordare</p>`
    : `<p class="product-price"><span>€</span>${Number(p.price).toFixed(2)}</p>`;

  const textField = p.requires_text
    ? `<textarea class="input product-text-input" id="text-${p.id}" rows="4" placeholder="${p.text_description ? p.text_description.replace(/"/g,'&quot;') : 'Scrivi qui...'}"></textarea>`
    : '';

  const qtyBlock = !p.price_on_request
    ? `<div class="qty-row">
         <label>Quantità</label>
         <input type="number" class="qty-input" id="qty-${p.id}" min="1" value="1" />
       </div>`
    : '';

  const buyButton = p.price_on_request
    ? `<button class="price-on-request-btn" disabled>Il prezzo del seguente prodotto va concordato con un dipendente, scrivi al bot @AtlasInvestimentiBot e accordati con un dipendente!</button>`
    : `<button class="btn btn-primary buy-btn auth-full" id="buy-${p.id}">
         <span>Aggiungi al carrello</span>
         <span class="spinner is-hidden"></span>
       </button>`;

  return `
    <div class="product-card">
      ${image}
      <div class="product-body">
        <p class="product-category">${p.category}</p>
        <h3 class="product-name">${p.name}</h3>
        ${priceBlock}
        ${textField}
        ${qtyBlock}
        ${buyButton}
      </div>
    </div>
  `;
}

function handleAddToCart(product) {
  if (product.requires_text) {
    const textInput = document.getElementById(`text-${product.id}`);
    const text = textInput.value.trim();
    if (!text) {
      textInput.style.borderColor = '#e5484d';
      textInput.focus();
      return;
    }
    textInput.style.borderColor = '';
    addToCart(product, text);
  } else {
    addToCart(product, null);
  }
}

loadProducts();
window.addEventListener('pageshow', (e) => { if (e.persisted) loadProducts(); });

// ---------- Cart ----------
const cartKey = `atlas_cart_${customer.id}`;

function getCart() { try { return JSON.parse(localStorage.getItem(cartKey)) || []; } catch { return []; } }
function saveCart(items) { localStorage.setItem(cartKey, JSON.stringify(items)); updateCartCount(); }
function updateCartCount() {
  const count = getCart().reduce((sum, i) => sum + i.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

function addToCart(product, customerText) {
  const qtyInput = document.getElementById(`qty-${product.id}`);
  const quantity = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

  const cart = getCart();
  cart.push({
    productId: product.id, name: product.name, price: product.price,
    category: product.category, quantity, customerText
  });
  saveCart(cart);

  const btn = document.getElementById(`buy-${product.id}`);
  const label = btn.querySelector('span:not(.spinner)');
  const original = label.textContent;
  label.textContent = 'Aggiunto ✓';
  btn.classList.add('is-added');
  setTimeout(() => { label.textContent = original; btn.classList.remove('is-added'); }, 1200);

  showToast(`${product.name} (x${quantity}) aggiunto al carrello`);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById('cart-items');
  const emptyCartEl = document.getElementById('cart-empty');
  const totalRow = document.getElementById('cart-total-row');
  const checkoutBtn = document.getElementById('cart-checkout');

  if (cart.length === 0) {
    itemsEl.innerHTML = '';
    emptyCartEl.classList.remove('is-hidden');
    totalRow.classList.add('is-hidden');
    checkoutBtn.classList.add('is-hidden');
    return;
  }

  emptyCartEl.classList.add('is-hidden');
  totalRow.classList.remove('is-hidden');
  checkoutBtn.classList.remove('is-hidden');

  itemsEl.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div>
        <p class="cart-item-name">${item.name} <span style="color:var(--grey); font-weight:400;">x${item.quantity}</span></p>
        <p class="cart-item-category">${item.category}</p>
        ${item.customerText ? `<p class="cart-item-category" style="font-style:italic;">"${item.customerText.slice(0, 60)}${item.customerText.length > 60 ? '…' : ''}"</p>` : ''}
      </div>
      <div class="cart-item-right">
        <span class="cart-item-price">€ ${(Number(item.price) * item.quantity).toFixed(2)}</span>
        <button type="button" class="cart-item-remove" data-i="${i}">✕</button>
      </div>
    </div>
  `).join('');

  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.i, 10)));
  });

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  document.getElementById('cart-total-amount').textContent = `€ ${total.toFixed(2)}`;
}

document.getElementById('btn-cart').addEventListener('click', () => {
  renderCart();
  document.getElementById('cart-modal').classList.remove('is-hidden');
});
document.getElementById('cart-close').addEventListener('click', closeCartModal);
document.getElementById('cart-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('cart-modal')) closeCartModal();
});
function closeCartModal() {
  document.getElementById('cart-modal').classList.add('is-hidden');
  document.getElementById('cart-error').classList.add('is-hidden');
}

document.getElementById('cart-checkout').addEventListener('click', async () => {
  const cart = getCart();
  if (cart.length === 0) return;

  const btn = document.getElementById('cart-checkout');
  const spinner = btn.querySelector('.spinner');
  const errorEl = document.getElementById('cart-error');
  errorEl.classList.add('is-hidden');

  btn.disabled = true;
  spinner.classList.remove('is-hidden');

  try {
    for (const item of cart) {
      const { data, error } = await supabaseClient.rpc('create_order_with_text', {
        p_customer_id: customer.id, p_product_id: item.productId,
        p_customer_text: item.customerText, p_quantity: item.quantity
      });
      if (error || !data.ok) throw new Error('Errore su un prodotto del carrello.');
    }

    saveCart([]);
    closeCartModal();
    showToast('Acquisto effettuato! Il nostro team è stato avvisato.');
  } catch (err) {
    errorEl.textContent = err.message || 'Errore durante l\'acquisto. Riprova.';
    errorEl.classList.remove('is-hidden');
  }

  spinner.classList.add('is-hidden');
  btn.disabled = false;
});

updateCartCount();

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  toast.classList.remove('is-hidden');
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.classList.add('is-hidden'), 300);
  }, 3200);
}

// ---------- Application modal ----------
const applyModal = document.getElementById('apply-modal');
const applyForm = document.getElementById('apply-form');
const hasExperienceSelect = document.getElementById('apply-has-experience');
const experienceWrap = document.getElementById('apply-experience-wrap');

document.getElementById('btn-apply').addEventListener('click', () => applyModal.classList.remove('is-hidden'));
document.getElementById('apply-close').addEventListener('click', closeApplyModal);
applyModal.addEventListener('click', (e) => { if (e.target === applyModal) closeApplyModal(); });

function closeApplyModal() {
  applyModal.classList.add('is-hidden');
  applyForm.reset();
  experienceWrap.classList.add('is-hidden');
  document.getElementById('apply-error').classList.add('is-hidden');
  document.getElementById('apply-success').classList.add('is-hidden');
}

hasExperienceSelect.addEventListener('change', () => {
  experienceWrap.classList.toggle('is-hidden', hasExperienceSelect.value !== 'si');
});

applyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('apply-error');
  const successEl = document.getElementById('apply-success');
  const submitBtn = document.getElementById('apply-submit');
  const spinner = submitBtn.querySelector('.spinner');
  errorEl.classList.add('is-hidden');

  const sector = document.getElementById('apply-sector').value;
  const motivation = document.getElementById('apply-motivation').value.trim();
  const hasExperience = hasExperienceSelect.value === 'si';
  const experienceDetails = document.getElementById('apply-experience-details').value.trim();

  submitBtn.disabled = true;
  spinner.classList.remove('is-hidden');

  const { error } = await supabaseClient.from('applications').insert({
    customer_id: customer.id, sector, motivation,
    has_experience: hasExperience, experience_details: hasExperience ? experienceDetails : null
  });

  spinner.classList.add('is-hidden');
  submitBtn.disabled = false;

  if (error) {
    errorEl.textContent = 'Errore durante l\'invio. Riprova.';
    errorEl.classList.remove('is-hidden');
    return;
  }

  successEl.classList.remove('is-hidden');
  setTimeout(closeApplyModal, 1800);
});