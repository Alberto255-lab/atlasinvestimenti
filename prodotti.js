const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
const isDirection = employee.role === 'Direttore' || employee.role === 'Vice Direttore';

document.getElementById('role-pill').textContent = employee.role || '—';
if (isDirection) document.getElementById('btn-add-product').classList.remove('is-hidden');

const loadingEl = document.getElementById('products-loading');
const emptyEl = document.getElementById('products-empty');
const gridEl = document.getElementById('products-grid');

async function loadProducts() {
  loadingEl.classList.remove('is-hidden');
  emptyEl.classList.add('is-hidden');
  gridEl.classList.add('is-hidden');

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  loadingEl.classList.add('is-hidden');

  if (error || !data || data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  gridEl.classList.remove('is-hidden');
  gridEl.innerHTML = data.map(productCardHtml).join('');

  data.forEach(p => {
    if (!isDirection) return;
    document.getElementById(`edit-${p.id}`).addEventListener('click', () => openEditModal(p));
    document.getElementById(`del-${p.id}`).addEventListener('click', () => openDeleteModal(p.id));
  });
}

function productCardHtml(p) {
  const image = p.image_url
    ? `<img src="${p.image_url}" alt="${p.name}" class="product-image" />`
    : `<div class="product-image-placeholder">📦</div>`;

  const manageBar = isDirection ? `
    <div class="product-manage-bar">
      <button type="button" class="icon-btn" id="edit-${p.id}">Modifica</button>
      <button type="button" class="icon-btn danger" id="del-${p.id}">Elimina</button>
    </div>
  ` : '';

  return `
    <div class="product-card reveal">
      ${image}
      <div class="product-body">
        <p class="product-category">${p.category}</p>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price"><span>€</span>${Number(p.price).toFixed(2)}</p>
      </div>
      ${manageBar}
    </div>
  `;
}

loadProducts();

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  toast.classList.remove('is-hidden');
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.classList.add('is-hidden'), 300);
  }, 3000);
}

const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const modalTitle = document.getElementById('product-modal-title');
const modalEyebrow = document.getElementById('product-modal-eyebrow');
const submitBtn = document.getElementById('product-submit');
const submitLabel = submitBtn.querySelector('span:not(.spinner)');

document.getElementById('btn-add-product').addEventListener('click', openAddModal);
document.getElementById('product-close').addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e) => { if (e.target === productModal) closeProductModal(); });

// ---------- Impostazioni avanzate ----------
document.getElementById('toggle-advanced').addEventListener('click', () => {
  document.getElementById('advanced-settings').classList.toggle('is-hidden');
});
document.getElementById('adv-requires-text').addEventListener('change', (e) => {
  document.getElementById('text-description-block').classList.toggle('is-hidden', !e.target.checked);
});

function openAddModal() {
  productForm.reset();
  document.getElementById('product-id').value = '';
  document.getElementById('advanced-settings').classList.add('is-hidden');
  document.getElementById('text-description-block').classList.add('is-hidden');
  modalEyebrow.textContent = 'Nuovo prodotto';
  modalTitle.textContent = 'Aggiungi prodotto';
  submitLabel.textContent = 'Crea prodotto';
  document.getElementById('product-error').classList.add('is-hidden');
  productModal.classList.remove('is-hidden');
}

function openEditModal(p) {
  document.getElementById('product-id').value = p.id;
  document.getElementById('product-image').value = p.image_url || '';
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-price').value = p.price;
  document.getElementById('product-category').value = p.category;
  document.getElementById('adv-requires-text').checked = !!p.requires_text;
  document.getElementById('adv-text-description').value = p.text_description || '';
  document.getElementById('adv-price-on-request').checked = !!p.price_on_request;
  document.getElementById('text-description-block').classList.toggle('is-hidden', !p.requires_text);
  document.getElementById('advanced-settings').classList.toggle('is-hidden', !(p.requires_text || p.price_on_request));
  modalEyebrow.textContent = 'Modifica prodotto';
  modalTitle.textContent = p.name;
  submitLabel.textContent = 'Salva modifiche';
  document.getElementById('product-error').classList.add('is-hidden');
  productModal.classList.remove('is-hidden');
}

function closeProductModal() {
  productModal.classList.add('is-hidden');
}

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('product-error');
  errorEl.classList.add('is-hidden');

  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const category = document.getElementById('product-category').value;
  const imageUrl = document.getElementById('product-image').value.trim() || null;
  const requiresText = document.getElementById('adv-requires-text').checked;
  const textDescription = requiresText ? document.getElementById('adv-text-description').value.trim() || null : null;
  const priceOnRequest = document.getElementById('adv-price-on-request').checked;

  const spinner = submitBtn.querySelector('.spinner');
  submitBtn.disabled = true;
  spinner.classList.remove('is-hidden');

  let result;
  if (id) {
    result = await supabaseClient.rpc('update_product', {
      p_employee_id: employee.id, p_product_id: id, p_name: name, p_price: price, p_category: category, p_image_url: imageUrl,
      p_requires_text: requiresText, p_text_description: textDescription, p_price_on_request: priceOnRequest
    });
  } else {
    result = await supabaseClient.rpc('create_product', {
      p_employee_id: employee.id, p_name: name, p_price: price, p_category: category, p_image_url: imageUrl,
      p_requires_text: requiresText, p_text_description: textDescription, p_price_on_request: priceOnRequest
    });
  }

  spinner.classList.add('is-hidden');
  submitBtn.disabled = false;

  const { data, error } = result;
  if (error || !data.ok) {
    errorEl.textContent = (data && data.error) || 'Errore, riprova.';
    errorEl.classList.remove('is-hidden');
    return;
  }

  closeProductModal();
  showToast(id ? 'Prodotto aggiornato!' : 'Prodotto creato!');
  loadProducts();
});

const deleteModal = document.getElementById('delete-modal');
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteModal.classList.remove('is-hidden');
}
document.getElementById('delete-cancel').addEventListener('click', () => {
  deleteModal.classList.add('is-hidden');
  pendingDeleteId = null;
});
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) { deleteModal.classList.add('is-hidden'); pendingDeleteId = null; }
});

document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const { data, error } = await supabaseClient.rpc('delete_product', {
    p_employee_id: employee.id, p_product_id: pendingDeleteId
  });
  deleteModal.classList.add('is-hidden');

  if (error || !data.ok) {
    showToast((data && data.error) || 'Errore durante l\'eliminazione.');
    return;
  }
  showToast('Prodotto eliminato.');
  loadProducts();
});