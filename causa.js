const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
const isDirection = employee.role === 'Direttore' || employee.role === 'Vice Direttore';
document.getElementById('role-pill').textContent = employee.role || '—';

const params = new URLSearchParams(window.location.search);
const caseId = params.get('id');
if (!caseId) window.location.href = 'avvocatura.html';

let currentCase = null;
let hasDocs = false;

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

async function loadCase() {
  const { data } = await supabaseClient.rpc('get_case', { p_case_id: caseId });
  const docsCheck = await supabaseClient.rpc('has_global_documents');
  hasDocs = !!docsCheck.data;

  document.getElementById('loading').classList.add('is-hidden');

  if (!data || !data.ok || !data.case) {
    document.querySelector('.shop-wrap').innerHTML = '<p style="color:var(--grey)">Causa non trovata.</p>';
    return;
  }

  currentCase = data.case;
  render();
}

function render() {
  document.getElementById('case-content').classList.remove('is-hidden');
  document.getElementById('case-defendant-title').textContent = currentCase.defendant_name;
  document.getElementById('case-status-eyebrow').textContent =
    currentCase.status === 'aperta' ? 'Causa aperta' : currentCase.status === 'vinta' ? 'Causa vinta' : 'Causa persa';

  const date = new Date(currentCase.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  document.getElementById('detail-date').textContent = date;
  document.getElementById('detail-description').textContent = currentCase.description;

  renderReasons('reasons-for-list', currentCase.reasons_for || [], 'favore');
  renderReasons('reasons-against-list', currentCase.reasons_against || [], 'contro');

  const isOpen = currentCase.status === 'aperta';

  if (isOpen) {
    document.getElementById('close-case-block').classList.remove('is-hidden');
    document.getElementById('closed-case-block').classList.add('is-hidden');
  } else {
    document.getElementById('close-case-block').classList.add('is-hidden');
    document.getElementById('closed-case-block').classList.remove('is-hidden');
    document.getElementById('closed-outcome-text').textContent =
      currentCase.status === 'vinta' ? '✓ Causa vinta con successo.' : '✕ Causa persa.';
  }

  document.getElementById('add-reason-for-row').classList.toggle('is-hidden', !isOpen);
  document.getElementById('add-reason-against-row').classList.toggle('is-hidden', !isOpen);

  const aiBtn = document.getElementById('btn-ask-ai');
  const aiHint = document.getElementById('ai-hint');
  if (isOpen && hasDocs) {
    aiBtn.disabled = false;
    aiHint.textContent = 'L\'AI userà la libreria documenti legali (sezione Avvocatura) per proporre una soluzione.';
  } else if (!isOpen) {
    aiBtn.disabled = true;
    aiHint.textContent = 'La causa è terminata, l\'AI non è più disponibile.';
  } else {
    aiBtn.disabled = true;
    aiHint.textContent = 'Serve almeno un documento nella libreria legale (vai su Avvocatura → Documenti legali).';
  }
}

function renderReasons(elId, arr, type) {
  const el = document.getElementById(elId);
  el.innerHTML = arr.length
    ? arr.map(r => `<li class="reason-${type}">${r}</li>`).join('')
    : '<li style="color:var(--grey); background:none; border:none; padding-left:0;">Nessuno ancora.</li>';
}

loadCase();

// Forza il refresh se la pagina viene ripristinata dalla cache di navigazione
// (bfcache), es. tornando indietro col tasto "indietro" del browser —
// altrimenti potresti vedere i dati della causa precedente.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) loadCase();
});

document.getElementById('add-reason-for-btn').addEventListener('click', () => addReason('favore', 'reason-for-input'));
document.getElementById('add-reason-against-btn').addEventListener('click', () => addReason('contro', 'reason-against-input'));

async function addReason(type, inputId) {
  const input = document.getElementById(inputId);
  const text = input.value.trim();
  if (!text) return;
  await supabaseClient.rpc('add_case_reason', { p_case_id: caseId, p_type: type, p_text: text });
  input.value = '';
  await loadCase();
  showToast('Motivo aggiunto.');
}

document.getElementById('btn-terminate').addEventListener('click', () => {
  document.getElementById('close-case-block').classList.add('is-hidden');
  document.getElementById('close-choice-row').classList.remove('is-hidden');
});

document.getElementById('btn-win').addEventListener('click', () => finalizeCase('vinta'));
document.getElementById('btn-lose').addEventListener('click', () => finalizeCase('persa'));

async function finalizeCase(result) {
  await supabaseClient.rpc('close_case', { p_case_id: caseId, p_result: result });
  showToast(result === 'vinta' ? 'Causa segnata come vinta!' : 'Causa segnata come persa.');
  await loadCase();
}

// ---------- Ask to AI (con errori visibili) ----------
document.getElementById('btn-ask-ai').addEventListener('click', async () => {
  const btn = document.getElementById('btn-ask-ai');
  const responseBox = document.getElementById('ai-response');
  const errorEl = document.getElementById('ai-error');
  errorEl.classList.add('is-hidden');
  responseBox.classList.add('is-hidden');
  btn.disabled = true;
  btn.textContent = 'Elaborazione in corso...';

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ mode: 'solve', case_id: caseId })
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`Risposta non valida dal server (${res.status}): ${text.slice(0,200)}`); }

    if (!res.ok || !json.ok) throw new Error(json.error || `Errore server (${res.status})`);

    responseBox.textContent = json.result;
    responseBox.classList.remove('is-hidden');

    await supabaseClient.rpc('log_ai_request', { p_case_id: caseId, p_employee_id: employee.id, p_response: json.result });
  } catch (err) {
    errorEl.textContent = `Errore: ${err.message}. Controlla che la Edge Function "legal-ai" sia stata deployata su Supabase.`;
    errorEl.classList.remove('is-hidden');
  }

  btn.disabled = false;
  btn.textContent = 'Ask to AI';
});