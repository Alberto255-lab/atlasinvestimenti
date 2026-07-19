const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
document.getElementById('role-pill').textContent = employee.role || '—';

const isDirection = employee.role === 'Direttore' || employee.role === 'Vice Direttore';
if (!isDirection && !(employee.settori || []).includes('Subaffitti')) {
  document.querySelector('.shop-wrap').innerHTML = `
    <div class="empty-state" style="padding-top:4rem;">
      <div class="empty-icon">🔒</div>
      <p>Questa sezione è riservata al reparto Subaffitti e alla Direzione.</p>
    </div>`;
  throw new Error('access denied');
}

function formatCountdown(endDate) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Scaduto';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return `${days}g ${hours}h ${mins}m`;
}

const loadingEl = document.getElementById('rentals-loading');
const emptyEl = document.getElementById('rentals-empty');
const listEl = document.getElementById('rentals-list');
let countdownInterval = null;

async function loadRentals() {
  loadingEl.classList.remove('is-hidden');
  emptyEl.classList.add('is-hidden');
  listEl.classList.add('is-hidden');

  const { data } = await supabaseClient.rpc('get_apartment_bookings');
  loadingEl.classList.add('is-hidden');

  if (!data || data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  listEl.classList.remove('is-hidden');
  listEl.innerHTML = data.map(rentalCardHtml).join('');

  data.forEach(b => {
    if (b.status === 'affittata') {
      document.getElementById(`unrent-${b.id}`)?.addEventListener('click', () => setNotRented(b.id));
    } else {
      document.getElementById(`rent-${b.id}`)?.addEventListener('click', () => openWeeksModal(b.id));
    }
    document.getElementById(`delrental-${b.id}`)?.addEventListener('click', () => deleteRental(b.id));
  });

  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    data.forEach(b => {
      if (b.status === 'affittata' && b.end_date) {
        const el = document.getElementById(`countdown-${b.id}`);
        if (el) el.textContent = `⏳ ${formatCountdown(b.end_date)}`;
      }
    });
  }, 60000);
}

function rentalCardHtml(b) {
  const isRented = b.status === 'affittata';
  const date = new Date(b.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

  return `
    <div class="order-card reveal ${!isRented ? 'is-new' : ''}">
      <div class="order-main">
        <span class="order-product">${b.apartment_name}</span>
        <span class="order-customer"><strong>${b.customer_nickname}</strong> — ${b.customer_telegram}</span>
        <span class="order-date">Richiesta il ${date}</span>
      </div>
      <div class="order-right">
        ${isRented
          ? `<div class="rental-timer" id="countdown-${b.id}">⏳ ${formatCountdown(b.end_date)}</div>
             <span class="order-status status-gestito">Affittata (${b.weeks} sett.)</span>
             <button class="mark-btn" id="unrent-${b.id}">Segna non affittata</button>`
          : `<span class="order-status status-nuovo">Non affittata</span>
             <button class="mark-btn" id="rent-${b.id}">Affittata</button>`
        }
        <button class="mark-btn danger" id="delrental-${b.id}">Elimina</button>
      </div>
    </div>
  `;
}

loadRentals();
window.addEventListener('pageshow', (e) => { if (e.persisted) loadRentals(); });

// ---------- Modale settimane: appare SOLO al click su "Affittata" ----------
const weeksModal = document.getElementById('weeks-modal');
let pendingBookingId = null;

function openWeeksModal(bookingId) {
  pendingBookingId = bookingId;
  document.getElementById('weeks-input').value = '';
  document.getElementById('weeks-error').classList.add('is-hidden');
  weeksModal.classList.remove('is-hidden');
}

document.getElementById('weeks-cancel').addEventListener('click', () => {
  weeksModal.classList.add('is-hidden');
  pendingBookingId = null;
});
weeksModal.addEventListener('click', (e) => {
  if (e.target === weeksModal) { weeksModal.classList.add('is-hidden'); pendingBookingId = null; }
});

document.getElementById('weeks-confirm').addEventListener('click', async () => {
  const weeks = parseInt(document.getElementById('weeks-input').value, 10);
  const errorEl = document.getElementById('weeks-error');

  if (!weeks || weeks < 1) {
    errorEl.textContent = 'Inserisci un numero di settimane valido.';
    errorEl.classList.remove('is-hidden');
    return;
  }

  await supabaseClient.rpc('set_booking_rented', { p_booking_id: pendingBookingId, p_weeks: weeks });
  weeksModal.classList.add('is-hidden');
  pendingBookingId = null;
  loadRentals();
});

async function setNotRented(bookingId) {
  await supabaseClient.rpc('set_booking_not_rented', { p_booking_id: bookingId });
  loadRentals();
}

async function deleteRental(bookingId) {
  await supabaseClient.rpc('delete_apartment_booking', { p_booking_id: bookingId });
  loadRentals();
}