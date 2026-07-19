// Rimuovi i limiti di tempo come richiesto - utilizzando timeout molto lunghi ma non infiniti per evitare blocchi permanenti
const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
document.getElementById('role-pill').textContent = employee.role || '—';

let currentCaseText = '';
let currentMcData = null;

const steps = {
  locked: document.getElementById('step-locked'),
  choice: document.getElementById('step-choice'),
  written: document.getElementById('step-written'),
  mc: document.getElementById('step-mc'),
  result: document.getElementById('step-result'),
};

function showStep(name) {
  Object.values(steps).forEach(s => s.classList.add('is-hidden'));
  steps[name].classList.remove('is-hidden');
}

document.querySelectorAll('[data-back]').forEach(btn => btn.addEventListener('click', () => showStep('choice')));

// ---------- Gate: servono documenti ----------
async function checkDocumentsAndInit() {
  const { data: hasDocs } = await supabaseClient.rpc('has_global_documents');
  if (!hasDocs) {
    showStep('locked');
    return;
  }
  showStep('choice');
}
checkDocumentsAndInit();

// ---------- Scritto: caso generato dall'AI in base ai documenti ----------
document.getElementById('choose-written').addEventListener('click', async () => {
  showStep('written');
  document.getElementById('written-case-text').textContent = 'Generazione del caso in corso...';
  document.getElementById('written-answer').value = '';
  document.getElementById('written-error').classList.add('is-hidden');

  // RIMOSSO LIMITE DI TEMPO come richiesto - usando timeout molto lungo
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800000); // 30 minuti massimo

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ mode: 'train_generate', type: 'scritto' }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Errore generazione caso');
    currentCaseText = json.case_text;
    document.getElementById('written-case-text').textContent = currentCaseText;
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err.name === 'AbortError' ? 'Timeout: il server non ha risposto entro 30 minuti.' : err.message;
    document.getElementById('written-case-text').textContent = '';
    document.getElementById('written-error').textContent = `Errore: ${msg}`;
    document.getElementById('written-error').classList.remove('is-hidden');
  }
});

document.getElementById('choose-multiple').addEventListener('click', async () => {
  showStep('mc');
  document.getElementById('mc-case-text').textContent = 'Generazione del caso in corso...';
  document.getElementById('mc-options').innerHTML = '';
  document.getElementById('mc-submit').disabled = true;

  // RIMOSSO LIMITE DI TEMPO come richiesto - usando timeout molto lungo
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800000); // 30 minuti massimo

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ mode: 'train_generate', type: 'scelta_multipla' }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Errore generazione caso');

    currentMcData = json;
    document.getElementById('mc-case-text').textContent = json.case_text;

    const optionsEl = document.getElementById('mc-options');
    let selected = null;
    optionsEl.innerHTML = json.options.map((opt, i) => `<button type="button" class="mc-option" data-i="${i}">${opt}</button>`).join('');
    optionsEl.querySelectorAll('.mc-option').forEach(b => {
      b.addEventListener('click', () => {
        optionsEl.querySelectorAll('.mc-option').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        selected = parseInt(b.dataset.i, 10);
        document.getElementById('mc-submit').disabled = false;
        document.getElementById('mc-submit').onclick = () => submitMultipleChoice(selected);
      });
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err.name === 'AbortError' ? 'Timeout: il server non ha risposto entro 30 minuti.' : err.message;
    document.getElementById('mc-case-text').textContent = `Errore: ${msg}`;
  }
});

async function submitMultipleChoice(selected) {
  const correct = selected === currentMcData.correct_index;
  const score = correct ? 100 : 0;

  await supabaseClient.rpc('submit_training', {
    p_employee_id: employee.id, p_type: 'scelta_multipla', p_case_text: currentMcData.case_text,
    p_answer_given: currentMcData.options[selected], p_correct: correct, p_score: score
  });

  document.getElementById('result-score').textContent = `${score}/100`;
  document.getElementById('result-feedback').textContent = correct
    ? 'Risposta corretta! Ottima linea difensiva basata sui documenti.'
    : `Risposta non corretta. La risposta giusta era: "${currentMcData.options[currentMcData.correct_index]}"`;
  showStep('result');
  loadHistory();
}

document.getElementById('step-written').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('written-error');
  errorEl.classList.add('is-hidden');

  const answer = document.getElementById('written-answer').value.trim();
  const submitBtn = document.getElementById('written-submit');
  const spinner = submitBtn.querySelector('.spinner');
  submitBtn.disabled = true;
  spinner.classList.remove('is-hidden');

  // RIMOSSO LIMITE DI TEMPO come richiesto - usando timeout molto lungo
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800000); // 30 minuti massimo

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ mode: 'train_score', case_text: currentCaseText, answer })
    });
    clearTimeout(timeoutId);
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Errore AI');

    const score = json.score ?? 0;
    await supabaseClient.rpc('submit_training', {
      p_employee_id: employee.id, p_type: 'scritto', p_case_text: currentCaseText,
      p_answer_given: answer, p_correct: score >= 60, p_score: score
    });

    document.getElementById('result-score').textContent = `${score}/100`;
    document.getElementById('result-feedback').textContent = json.feedback || 'Valutazione completata.';
    showStep('result');
    loadHistory();
  } catch (err) {
    clearTimeout(timeoutId);
    errorEl.textContent = `Errore durante la valutazione AI: ${err.message}`;
    errorEl.classList.remove('is-hidden');
  }

  spinner.classList.add('is-hidden');
  submitBtn.disabled = false;
});

document.getElementById('btn-retry').addEventListener('click', () => showStep('choice'));

// ---------- Cronologia ----------
async function loadHistory() {
  const { data } = await supabaseClient.rpc('get_my_trainings', { p_employee_id: employee.id });
  const el = document.getElementById('history-list');
  if (!data || data.length === 0) {
    el.innerHTML = '<p style="color:var(--grey); font-size:0.85rem;">Nessun allenamento ancora svolto.</p>';
    return;
  }

  el.innerHTML = data.map(t => {
    const date = new Date(t.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    const typeLabel = t.type === 'scritto' ? 'Scritto' : 'Scelta multipla';
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.7rem 0; border-bottom:1px solid var(--line);">
        <div>
          <strong style="font-size:0.9rem;">${typeLabel}</strong>
          <span style="color:var(--grey); font-size:0.8rem; margin-left:0.6rem;">${date}</span>
        </div>
        <div style="display:flex; align-items:center; gap:0.8rem;">
          <span style="color:var(--blue-1); font-weight:700;">${t.score}/100</span>
          <button type="button" class="icon-btn danger" style="padding:0.3rem 0.7rem;" data-t="${t.id}">Elimina</button>
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('[data-t]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.rpc('delete_training', { p_employee_id: employee.id, p_training_id: btn.dataset.t });
      loadHistory();
    });
  });
}

// ---------- Modale cronologia (staccata, si apre solo al click) ----------
const historyModal = document.getElementById('history-modal');
document.getElementById('btn-history').addEventListener('click', () => {
  historyModal.classList.remove('is-hidden');
  loadHistory();
});
document.getElementById('history-close').addEventListener('click', () => historyModal.classList.add('is-hidden'));
historyModal.addEventListener('click', (e) => { if (e.target === historyModal) historyModal.classList.add('is-hidden'); });

window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});