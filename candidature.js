const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
document.getElementById('role-pill').textContent = employee.role || '—';

const loadingEl = document.getElementById('loading');
const emptyEl = document.getElementById('empty');
const listEl = document.getElementById('applications-list');

async function loadApplications() {
  const { data, error } = await supabaseClient.rpc('get_applications');
  loadingEl.classList.add('is-hidden');

  if (error) {
    emptyEl.classList.remove('is-hidden');
    emptyEl.innerHTML = `<div class="empty-icon">⚠️</div><p style="color:#e5484d;">Errore: ${error.message}</p><p style="color:var(--grey); font-size:0.85rem; margin-top:0.5rem;">Probabilmente non hai ancora eseguito lo script fix_batch_rpc.sql su Supabase.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  listEl.classList.remove('is-hidden');
  listEl.innerHTML = data.map(applicationCardHtml).join('');

  data.forEach(a => {
    document.getElementById(`del-${a.id}`)?.addEventListener('click', () => deleteApplication(a.id));
  });
}

function applicationCardHtml(a) {
  const date = new Date(a.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  return `
    <div class="order-card reveal is-new" style="align-items:flex-start; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; width:100%; flex-wrap:wrap; gap:0.6rem;">
        <div class="order-main">
          <span class="order-product">${a.sector}</span>
          <span class="order-customer"><strong>${a.customer_nickname}</strong> — ${a.customer_telegram}</span>
          <span class="order-date">${date}</span>
        </div>
        <button class="mark-btn danger" id="del-${a.id}">Elimina</button>
      </div>
      <div style="margin-top:0.8rem; width:100%; padding-top:0.8rem; border-top:1px solid var(--line);">
        <p style="font-size:0.85rem; color:var(--grey); margin-bottom:0.3rem;"><strong style="color:var(--white);">Motivazione:</strong> ${a.motivation}</p>
        <p style="font-size:0.85rem; color:var(--grey);"><strong style="color:var(--white);">Esperienza:</strong> ${a.has_experience ? (a.experience_details || 'Sì, non specificata') : 'Nessuna esperienza dichiarata'}</p>
      </div>
    </div>
  `;
}

async function deleteApplication(id) {
  await supabaseClient.rpc('delete_application', { p_application_id: id });
  loadApplications();
}

loadApplications();
window.addEventListener('pageshow', (e) => { if (e.persisted) loadApplications(); });