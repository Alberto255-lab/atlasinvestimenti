const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
const isDirection = employee.role === 'Direttore' || employee.role === 'Vice Direttore';
document.getElementById('role-pill').textContent = employee.role || '—';

const loadingEl = document.getElementById('loading');
const emptyEl = document.getElementById('empty');
const gridEl = document.getElementById('cases-grid');

async function loadCases() {
  const { data } = await supabaseClient.rpc('get_cases');
  loadingEl.classList.add('is-hidden');

  if (!data || data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  gridEl.classList.remove('is-hidden');
  gridEl.innerHTML = data.map(caseCardHtml).join('');

  data.forEach(c => {
    document.getElementById(`case-${c.id}`).addEventListener('click', () => {
      window.location.href = `causa.html?id=${c.id}`;
    });
    document.getElementById(`delcase-${c.id}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Eliminare la causa "${c.defendant_name}"? Azione irreversibile.`)) return;
      deleteCase(c.id);
    });
  });
}

async function deleteCase(caseId) {
  const { data, error } = await supabaseClient.rpc('delete_case', { p_employee_id: employee.id, p_case_id: caseId });
  if (error || !data.ok) { showToast((data && data.error) || 'Errore.'); return; }
  showToast('Causa eliminata.');
  loadCases();
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

function caseCardHtml(c) {
  const date = new Date(c.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  const statusLabel = c.status === 'aperta' ? 'Aperta' : c.status === 'vinta' ? 'Vinta' : 'Persa';
  const deleteBtn = isDirection ? `<button type="button" class="icon-btn danger" style="margin-top:0.4rem;" id="delcase-${c.id}">Elimina causa</button>` : '';
  return `
    <div class="case-card status-${c.status} reveal">
      <div id="case-${c.id}" style="cursor:pointer;">
        <span class="case-status-badge">${statusLabel}</span>
        <h3 class="case-defendant">${c.defendant_name}</h3>
        <p class="case-meta">Aperta il ${date} da ${c.created_by_nickname || '—'}</p>
      </div>
      ${deleteBtn}
    </div>
  `;
}

loadCases();

window.addEventListener('pageshow', (event) => {
  if (event.persisted) loadCases();
});

// ---------- Add case modal ----------
const modal = document.getElementById('case-modal');
const form = document.getElementById('case-form');
const submitBtn = document.getElementById('case-submit');

document.getElementById('btn-add-case').addEventListener('click', () => {
  form.reset();
  document.getElementById('case-error').classList.add('is-hidden');
  modal.classList.remove('is-hidden');
});
document.getElementById('case-close').addEventListener('click', () => modal.classList.add('is-hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('is-hidden'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('case-error');
  errorEl.classList.add('is-hidden');

  const defendant = document.getElementById('case-defendant').value.trim();
  const description = document.getElementById('case-description').value.trim();

  const spinner = submitBtn.querySelector('.spinner');
  submitBtn.disabled = true;
  spinner.classList.remove('is-hidden');

  const { data, error } = await supabaseClient.rpc('create_case', {
    p_employee_id: employee.id, p_defendant_name: defendant, p_description: description
  });

  spinner.classList.add('is-hidden');
  submitBtn.disabled = false;

  if (error || !data.ok) {
    errorEl.textContent = (data && data.error) || 'Errore, riprova.';
    errorEl.classList.remove('is-hidden');
    return;
  }

  window.location.href = `causa.html?id=${data.id}`;
});

// ---------- Global legal documents modal ----------
const docsModal = document.getElementById('documents-modal');
document.getElementById('btn-documents').addEventListener('click', () => {
  loadGlobalDocuments();
  docsModal.classList.remove('is-hidden');
});
document.getElementById('documents-close').addEventListener('click', () => docsModal.classList.add('is-hidden'));
docsModal.addEventListener('click', (e) => { if (e.target === docsModal) docsModal.classList.add('is-hidden'); });

if (isDirection) document.getElementById('add-global-doc-block').classList.remove('is-hidden');

async function loadGlobalDocuments() {
  const docs = await supabaseClient.rpc('get_global_documents');
  const list = document.getElementById('global-doc-list');
  const data = docs.data || [];

  list.innerHTML = data.length
    ? data.map(d => `
        <li>
          <a href="${d.gdoc_url}" target="_blank" rel="noopener">${d.title}</a>
          ${isDirection ? `<button type="button" class="icon-btn danger" style="padding:0.3rem 0.6rem;" data-gdoc="${d.id}">✕</button>` : ''}
        </li>
      `).join('')
    : '<li style="color:var(--grey);">Nessun documento caricato ancora.</li>';

  list.querySelectorAll('[data-gdoc]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.rpc('delete_legal_document', { p_employee_id: employee.id, p_document_id: btn.dataset.gdoc });
      loadGlobalDocuments();
    });
  });
}

document.getElementById('add-gdoc-btn')?.addEventListener('click', async () => {
  const title = document.getElementById('gdoc-title').value.trim();
  const url = document.getElementById('gdoc-url').value.trim();
  if (!title || !url) return;

  const { data, error } = await supabaseClient.rpc('add_global_document', {
    p_employee_id: employee.id, p_title: title, p_gdoc_url: url
  });

  if (error || !data.ok) { showToast((data && data.error) || 'Errore.'); return; }

  document.getElementById('gdoc-title').value = '';
  document.getElementById('gdoc-url').value = '';
  showToast('Documento caricato.');
  loadGlobalDocuments();
});