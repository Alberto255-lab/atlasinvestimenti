// ---------- Session guard ----------
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
const gridEl = document.getElementById('roles-grid');

async function loadRoles() {
  loadingEl.classList.remove('is-hidden');
  gridEl.classList.add('is-hidden');

  const { data } = await supabaseClient.rpc('get_roles');
  loadingEl.classList.add('is-hidden');
  gridEl.classList.remove('is-hidden');
  gridEl.innerHTML = (data || []).map(roleCardHtml).join('');

  (data || []).forEach(r => {
    if (r.is_system) return;
    document.getElementById(`del-${r.id}`)?.addEventListener('click', () => openDeleteModal(r));
  });
}

function roleCardHtml(r) {
  return `
    <div class="role-card reveal">
      <div class="role-card-top">
        <span class="role-card-name">${r.name}</span>
        ${r.is_system ? '<span class="system-tag">Sistema</span>' : ''}
      </div>
      ${r.is_system
        ? `<span style="color:var(--grey); font-size:0.82rem;">Ruolo protetto, non eliminabile</span>`
        : `<button type="button" class="icon-btn danger" id="del-${r.id}">Elimina ruolo</button>`}
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

// ---------- Add role modal ----------
const modal = document.getElementById('role-modal');
const form = document.getElementById('role-form');
const submitBtn = document.getElementById('role-submit');

document.getElementById('btn-add-role').addEventListener('click', () => {
  form.reset();
  document.getElementById('role-error').classList.add('is-hidden');
  modal.classList.remove('is-hidden');
});
document.getElementById('role-close').addEventListener('click', () => modal.classList.add('is-hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('is-hidden'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('role-error');
  errorEl.classList.add('is-hidden');

  const name = document.getElementById('role-name').value.trim();
  const spinner = submitBtn.querySelector('.spinner');
  submitBtn.disabled = true;
  spinner.classList.remove('is-hidden');

  const { data, error } = await supabaseClient.rpc('create_role', {
    p_employee_id: employee.id, p_name: name
  });

  spinner.classList.add('is-hidden');
  submitBtn.disabled = false;

  if (error || !data.ok) {
    errorEl.textContent = (data && data.error) || 'Errore, riprova.';
    errorEl.classList.remove('is-hidden');
    return;
  }

  modal.classList.add('is-hidden');
  showToast('Ruolo creato!');
  loadRoles();
});

// ---------- Delete modal ----------
const deleteModal = document.getElementById('delete-modal');
let pendingDelete = null;

function openDeleteModal(r) {
  pendingDelete = r;
  document.getElementById('delete-target-name').textContent = `Stai per eliminare il ruolo "${r.name}".`;
  deleteModal.classList.remove('is-hidden');
}
document.getElementById('delete-cancel').addEventListener('click', () => { deleteModal.classList.add('is-hidden'); pendingDelete = null; });
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) { deleteModal.classList.add('is-hidden'); pendingDelete = null; } });

document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (!pendingDelete) return;
  const { data, error } = await supabaseClient.rpc('delete_role', {
    p_employee_id: employee.id, p_role_id: pendingDelete.id
  });
  deleteModal.classList.add('is-hidden');

  if (error || !data.ok) {
    showToast((data && data.error) || 'Errore durante l\'eliminazione.');
    return;
  }
  showToast('Ruolo eliminato.');
  loadRoles();
});

loadRoles();
