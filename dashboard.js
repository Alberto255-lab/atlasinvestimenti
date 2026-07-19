// ---------- Session guard ----------
const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) {
  window.location.href = 'dipendente.html';
}
const employee = JSON.parse(employeeRaw || '{}');

const isDirection = (role) => role === 'Direttore' || role === 'Vice Direttore';

document.getElementById('username-display').textContent = employee.nickname || 'Dipendente';
document.getElementById('role-pill').textContent = employee.role || '—';

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('atlas_employee');
  window.location.href = 'index.html';
});

// ---------- Menu definition ----------
const menus = [
  {
    key: 'prodotti',
    icon: '🛒',
    name: 'Prodotti',
    desc: 'Visualizza il catalogo. Aggiunta e modifica riservate a Direzione.',
    href: 'prodotti.html',
    available: true,
  },
  {
    key: 'ordini',
    icon: '📬',
    name: 'Ordini',
    desc: 'Notifiche degli acquisti effettuati dai clienti.',
    href: 'ordini.html',
    available: true,
  },
  {
    key: 'prenotazioni',
    icon: '📅',
    name: 'Prenotazioni Subaffitti',
    desc: 'Gestisci le richieste di affitto dei clienti.',
    href: 'prenotazioni.html',
    available: true,
  },
  {
    key: 'candidature',
    icon: '📄',
    name: 'Candidature',
    desc: 'Candidature ricevute dai clienti per unirsi al team.',
    href: 'candidature.html',
    available: isDirection(employee.role),
  },
  {
    key: 'dipendenti',
    icon: '👥',
    name: 'Dipendenti',
    desc: 'Crea e gestisci le credenziali del personale.',
    href: 'dipendenti.html',
    available: isDirection(employee.role),
  },
  {
    key: 'subaffitti',
    icon: '🏠',
    name: 'Subaffitti',
    desc: 'Gestisci appartamenti disponibili per l\'affitto.',
    href: 'subaffitti.html',
    available: isDirection(employee.role),
  },
  {
    key: 'ruoli',
    icon: '🏷️',
    name: 'Ruoli',
    desc: 'Crea e organizza i ruoli aziendali.',
    href: 'ruoli.html',
    available: isDirection(employee.role),
  },
  {
    key: 'avvocatura',
    icon: '⚖️',
    name: 'Avvocatura',
    desc: 'Cause, documenti legali e allenamento avvocati.',
    href: 'avvocatura.html',
    available: true,
  },
];

const grid = document.getElementById('menu-grid');
grid.innerHTML = menus.map((m, i) => menuCardHtml(m, i)).join('');

menus.forEach(m => {
  const el = document.getElementById(`menu-${m.key}`);
  if (!m.available) return;
  el.addEventListener('click', () => { window.location.href = m.href; });
});

function menuCardHtml(m, i) {
  const lockedClass = m.available ? '' : 'is-locked';
  const arrowText = m.available ? 'Apri sezione →' : 'Non disponibile per il tuo ruolo';
  return `
    <div class="menu-card ${lockedClass} reveal" style="--d:${i * 0.06}s" id="menu-${m.key}">
      <div class="menu-icon">${m.icon}</div>
      <h3 class="menu-name">${m.name}</h3>
      <p class="menu-desc">${m.desc}</p>
      <span class="menu-arrow">${arrowText}</span>
    </div>
  `;
}

window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});