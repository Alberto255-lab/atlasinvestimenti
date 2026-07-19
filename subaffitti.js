const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
const isDirection = employee.role === 'Direttore' || employee.role === 'Vice Direttore';
document.getElementById('role-pill').textContent = employee.role || '—';

if (!isDirection) {
  document.querySelector('.shop-wrap').innerHTML = `
    <div class="empty-state" style="padding-top:4rem;">
      <div class="empty-icon">🔒</div>
      <p>Questa sezione è riservata a Direttore e Vice Direttore.</p>
    </div>`;
  throw new Error('access denied');
}

const loadingEl = document.getElementById('loading');
const emptyEl = document.getElementById('empty');
const gridEl = document.getElementById('apartments-grid');

async function loadApartments() {
  loadingEl.classList.remove('is-hidden');
  emptyEl.classList.add('is-hidden');
  gridEl.classList.add('is-hidden');

  const { data } = await supabaseClient.rpc('get_apartments_admin', { p_employee_id: employee.id });
  loadingEl.classList.add('is-hidden');

  if (!data || !data.ok || !data.data || data.data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  gridEl.classList.remove('is-hidden');
  gridEl.innerHTML = data.data.map(apartmentCardHtml).join('');

  data.data.forEach(a => {
    document.getElementById(`edit-${a.id}`).addEventListener('click', () => openEditModal(a));
    document.getElementById(`del-${a.id}`).addEventListener('click', () => openDeleteModal(a.id));
    document.getElementById(`toggle-${a.id}`).addEventListener('change', (e) => toggleEnabled(a.id, e.target.checked));
  });
}

function apartmentCardHtml(a) {
  const isBooked = !!a.active_booking_id;
  let statusBadge;
  if (isBooked) statusBadge = '<span class="apt-status-badge apt-status-booked">Prenotato</span>';
  else if (!a.enabled) statusBadge = '<span class="apt-status-badge apt-status-disabled">Disabilitato</span>';
  else statusBadge = '<span class="apt-status-badge apt-status-free">Disponibile</span>';

  return `
    <div class="apartment-card reveal">
      ${statusBadge}
      <h3 class="apartment-name">${a.name}</h3>
      <p class="apartment-meta">${a.size} · ${a.coordinates}</p>
      <p class="apartment-price">€ ${Number(a.rent_cost).toFixed(2)} / settimana</p>

      <label class="toggle-switch">
        <input type="checkbox" id="toggle-${a.id}" ${a.enabled ? 'checked' : ''} />
        <span class="toggle-track"></span>
        Abilitato per la prenotazione
      </label>

      <div class="apartment-actions">
        <button type="button" class="icon-btn" id="edit-${a.id}">Modifica</button>
        <button type="button" class="icon-btn danger" id="del-${a.id}">Elimina</button>
      </div>
    </div>
  `;
}

loadApartments();
window.addEventListener('pageshow', (e) => { if (e.persisted) loadApartments(); });

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

async function toggleEnabled(id, enabled) {
  await supabaseClient.rpc('toggle_apartment_enabled', { p_employee_id: employee.id, p_apartment_id: id, p_enabled: enabled });
  showToast(enabled ? 'Appartamento abilitato.' : 'Appartamento disabilitato.');
  loadApartments();
}

// ---------- Add / Edit modal ----------
const modal = document.getElementById('apartment-modal');
const form = document.getElementById('apartment-form');
const modalTitle = document.getElementById('apartment-modal-title');
const modalEyebrow = document.getElementById('apartment-modal-eyebrow');
const submitBtn = document.getElementById('apartment-submit');
const submitLabel = submitBtn.querySelector('span:not(.spinner)');

document.getElementById('btn-add-apartment').addEventListener('click', openAddModal);
document.getElementById('apartment-close').addEventListener('click', () => modal.classList.add('is-hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('is-hidden'); });

function openAddModal() {
  form.reset();
  document.getElementById('apartment-id').value = '';
  modalEyebrow.textContent = 'Nuovo appartamento';
  modalTitle.textContent = 'Aggiungi appartamento';
  submitLabel.textContent = 'Crea appartamento';
  document.getElementById('apartment-error').classList.add('is-hidden');
  modal.classList.remove('is-hidden');
}

function openEditModal(a) {
  document.getElementById('apartment-id').value = a.id;
  document.getElementById('apt-name').value = a.name;
  document.getElementById('apt-size').value = a.size;
  document.getElementById('apt-cost').value = a.rent_cost;
  document.getElementById('apt-coords').value = a.coordinates;
  modalEyebrow.textContent = 'Modifica appartamento';
  modalTitle.textContent = a.name;
  submitLabel.textContent = 'Salva modifiche';
  document.getElementById('apartment-error').classList.add('is-hidden');
  modal.classList.remove('is-hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('apartment-error');
  errorEl.classList.add('is-hidden');

  const id = document.getElementById('apartment-id').value;
  const name = document.getElementById('apt-name').value.trim();
  const size = document.getElementById('apt-size').value.trim();
  const cost = parseFloat(document.getElementById('apt-cost').value);
  const coords = document.getElementById('apt-coords').value.trim();

  const spinner = submitBtn.querySelector('.spinner');
  submitBtn.disabled = true;
  spinner.classList.remove('is-hidden');

  let result;
  if (id) {
    result = await supabaseClient.rpc('update_apartment', {
      p_employee_id: employee.id, p_apartment_id: id, p_name: name, p_size: size, p_rent_cost: cost, p_coordinates: coords
    });
  } else {
    result = await supabaseClient.rpc('create_apartment', {
      p_employee_id: employee.id, p_name: name, p_size: size, p_rent_cost: cost, p_coordinates: coords
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

  modal.classList.add('is-hidden');
  showToast(id ? 'Appartamento aggiornato!' : 'Appartamento creato!');
  loadApartments();
});

// ---------- Delete modal ----------
const deleteModal = document.getElementById('delete-modal');
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteModal.classList.remove('is-hidden');
}
document.getElementById('delete-cancel').addEventListener('click', () => { deleteModal.classList.add('is-hidden'); pendingDeleteId = null; });
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) { deleteModal.classList.add('is-hidden'); pendingDeleteId = null; } });

document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const { data, error } = await supabaseClient.rpc('delete_apartment', { p_employee_id: employee.id, p_apartment_id: pendingDeleteId });
  deleteModal.classList.add('is-hidden');

  if (error || !data.ok) { showToast((data && data.error) || 'Errore.'); return; }
  showToast('Appartamento eliminato.');
  loadApartments();
});