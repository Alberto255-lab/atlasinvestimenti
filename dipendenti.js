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

let rolesCache = [];
const loadingEl = document.getElementById('loading');
const emptyEl = document.getElementById('empty');
const listEl = document.getElementById('employees-list');

async function loadRoles() {
  const { data } = await supabaseClient.rpc('get_roles');
  rolesCache = data || [];
  const select = document.getElementById('employee-role');
  select.innerHTML = rolesCache.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
}

async function loadEmployees() {
  loadingEl.classList.remove('is-hidden');
  emptyEl.classList.add('is-hidden');
  listEl.classList.add('is-hidden');

  const { data, error } = await supabaseClient.rpc('get_employees', { p_employee_id: employee.id });
  loadingEl.classList.add('is-hidden');

  if (error || !data.ok || !data.data || data.data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  listEl.classList.remove('is-hidden');
  listEl.innerHTML = data.data.map(employeeCardHtml).join('');

  data.data.forEach(e => {
    document.getElementById(`edit-${e.id}`).addEventListener('click', () => openEditModal(e));
    document.getElementById(`del-${e.id}`).addEventListener('click', () => openDeleteModal(e));
  });
}

function employeeCardHtml(e) {
  const initials = e.nickname.slice(0, 2).toUpperCase();
  const canDelete = e.nickname !== 'NotAlbe';
  return `
    <div class="employee-card reveal">
      <div class="employee-main">
        <div class="employee-avatar">${initials}</div>
        <div class="employee-info">
          <span class="employee-name">${e.nickname}</span>
          <span class="employee-telegram">${e.telegram || '—'}</span>
        </div>
      </div>
      <div class="employee-actions">
        <span class="role-badge">${e.role_name || 'Nessun ruolo'}</span>
        ${(e.settori || []).map(s => `<span class="settore-badge">${s}</span>`).join('')}
        <button type="button" class="icon-btn" id="edit-${e.id}">Modifica</button>
        ${canDelete ? `<button type="button" class="icon-btn danger" id="del-${e.id}">Elimina</button>` : `<button type="button" class="icon-btn" id="del-${e.id}" disabled style="opacity:0.4;cursor:not-allowed;">Protetto</button>`}
      </div>
    </div>
  `;
}

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

const modal = document.getElementById('employee-modal');
const form = document.getElementById('employee-form');
const modalTitle = document.getElementById('employee-modal-title');
const modalEyebrow = document.getElementById('employee-modal-eyebrow');
const submitBtn = document.getElementById('employee-submit');
const submitLabel = submitBtn.querySelector('span:not(.spinner)');
const passwordHint = document.getElementById('password-hint');
const passwordInput = document.getElementById('employee-password');

document.getElementById('btn-add-employee').addEventListener('click', openAddModal);
document.getElementById('employee-close').addEventListener('click', () => modal.classList.add('is-hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('is-hidden'); });

function openAddModal() {
  form.reset();
  document.getElementById('employee-id').value = '';
  document.querySelectorAll('#employee-settore-checks input').forEach(cb => cb.checked = false);
  modalEyebrow.textContent = 'Nuove credenziali';
  modalTitle.textContent = 'Crea Credenziali';
  submitLabel.textContent = 'Crea Credenziali';
  passwordHint.textContent = '';
  passwordInput.required = true;
  document.getElementById('employee-error').classList.add('is-hidden');
  modal.classList.remove('is-hidden');
}

function openEditModal(e) {
  document.getElementById('employee-id').value = e.id;
  document.getElementById('employee-nickname').value = e.nickname;
  document.getElementById('employee-telegram').value = e.telegram || '';
  document.getElementById('employee-role').value = e.role_id || '';
  const settoriSet = new Set(e.settori || []);
  document.querySelectorAll('#employee-settore-checks input').forEach(cb => {
    cb.checked = settoriSet.has(cb.value);
  });
  passwordInput.value = '';
  passwordInput.required = false;
  passwordHint.textContent = '(lascia vuoto per non cambiarla)';
  modalEyebrow.textContent = 'Modifica dipendente';
  modalTitle.textContent = e.nickname;
  submitLabel.textContent = 'Salva modifiche';
  document.getElementById('employee-error').classList.add('is-hidden');
  modal.classList.remove('is-hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('employee-error');
  errorEl.classList.add('is-hidden');

  const id = document.getElementById('employee-id').value;
  const nickname = document.getElementById('employee-nickname').value.trim();
  const password = passwordInput.value;
  let telegram = document.getElementById('employee-telegram').value.trim();
  if (telegram && !telegram.startsWith('@')) telegram = '@' + telegram;
  const roleId = document.getElementById('employee-role').value;
  const settori = Array.from(document.querySelectorAll('#employee-settore-checks input:checked')).map(cb => cb.value);

  const spinner = submitBtn.querySelector('.spinner');
  submitBtn.disabled = true;
  spinner.classList.remove('is-hidden');

  let result;
  if (id) {
    result = await supabaseClient.rpc('update_employee', {
      p_employee_id: employee.id, p_target_id: id, p_nickname: nickname, p_telegram: telegram, p_role_id: roleId, p_new_password: password || null, p_settori: settori
    });
  } else {
    result = await supabaseClient.rpc('create_employee', {
      p_nickname: nickname, p_password: password, p_telegram: telegram, p_role_id: roleId, p_creator_id: employee.id, p_settori: settori
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
  showToast(id ? 'Dipendente aggiornato!' : 'Credenziali create!');
  loadEmployees();
});

const deleteModal = document.getElementById('delete-modal');
let pendingDelete = null;

function openDeleteModal(e) {
  pendingDelete = e;
  document.getElementById('delete-target-name').textContent = `Stai per rimuovere ${e.nickname}. Questa azione non può essere annullata.`;
  deleteModal.classList.remove('is-hidden');
}
document.getElementById('delete-cancel').addEventListener('click', () => { deleteModal.classList.add('is-hidden'); pendingDelete = null; });
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) { deleteModal.classList.add('is-hidden'); pendingDelete = null; } });

document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (!pendingDelete) return;
  const { data, error } = await supabaseClient.rpc('delete_employee', { p_employee_id: employee.id, p_target_id: pendingDelete.id });
  deleteModal.classList.add('is-hidden');
  if (error || !data.ok) { showToast((data && data.error) || 'Errore.'); return; }
  showToast('Dipendente rimosso.');
  loadEmployees();
});

loadRoles();
loadEmployees();