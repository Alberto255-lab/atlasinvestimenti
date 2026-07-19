const customerRaw = localStorage.getItem('atlas_customer');
if (!customerRaw) window.location.href = 'cliente.html';
const customer = JSON.parse(customerRaw || '{}');

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

function formatCountdown(endDate) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Scaduto';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return `${days}g ${hours}h ${mins}m`;
}

let countdownInterval = null;

async function loadMyBooking() {
  const { data } = await supabaseClient.rpc('get_my_bookings', { p_customer_id: customer.id });
  const section = document.getElementById('my-booking-section');
  const card = document.getElementById('my-booking-card');

  const active = (data || []).find(b => !b.end_date || new Date(b.end_date) > new Date());

  if (!active) {
    section.classList.add('is-hidden');
    return;
  }

  section.classList.remove('is-hidden');
  const isRented = active.status === 'affittata';
  card.innerHTML = `
    <div class="apartment-card reveal">
      <span class="apt-status-badge ${isRented ? 'apt-status-booked' : 'apt-status-free'}">${isRented ? 'Affittato' : 'In attesa di conferma'}</span>
      <h3 class="apartment-name">${active.apartment_name}</h3>
      <p class="apartment-meta">${active.size} · ${active.coordinates}</p>
      <p class="apartment-price">€ ${Number(active.rent_cost).toFixed(2)} / settimana</p>
      ${isRented ? `<div class="rental-timer" id="my-countdown">⏳ ${formatCountdown(active.end_date)}</div>` : `<p style="color:var(--grey); font-size:0.85rem;">In attesa che la direzione confermi l'affitto.</p>`}
    </div>
  `;

  if (isRented) {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const el = document.getElementById('my-countdown');
      if (el) el.textContent = `⏳ ${formatCountdown(active.end_date)}`;
    }, 60000);
  }
}

const loadingEl = document.getElementById('loading');
const emptyEl = document.getElementById('empty');
const gridEl = document.getElementById('apartments-grid');

async function loadAvailable() {
  loadingEl.classList.remove('is-hidden');
  emptyEl.classList.add('is-hidden');
  gridEl.classList.add('is-hidden');

  // Usa la funzione che mostra TUTTI gli appartamenti abilitati,
  // prenotati o no (con badge di stato), non solo quelli liberi.
  const { data, error } = await supabaseClient.rpc('get_apartments_for_customers');
  loadingEl.classList.add('is-hidden');

  if (error || !data || data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  gridEl.classList.remove('is-hidden');
  gridEl.innerHTML = data.map(apartmentCardHtml).join('');

  data.forEach(a => {
    if (!a.is_booked) {
      document.getElementById(`book-${a.id}`)?.addEventListener('click', () => bookApartment(a.id));
    }
  });
}

function apartmentCardHtml(a) {
  const booked = a.is_booked;
  return `
    <div class="apartment-card reveal">
      <span class="apt-status-badge ${booked ? 'apt-status-booked' : 'apt-status-free'}">${booked ? 'Appartamento Prenotato' : 'Disponibile'}</span>
      <h3 class="apartment-name">${a.name}</h3>
      <p class="apartment-meta">${a.size} · ${a.coordinates}</p>
      <p class="apartment-price">€ ${Number(a.rent_cost).toFixed(2)} / settimana</p>
      <button class="book-btn ${booked ? 'is-booked' : ''}" id="book-${a.id}" ${booked ? 'disabled' : ''}>
        ${booked ? '🔒 Appartamento Prenotato' : '🔑 Prenota ora'}
      </button>
    </div>
  `;
}

async function bookApartment(apartmentId) {
  const { data, error } = await supabaseClient.rpc('book_apartment', { p_customer_id: customer.id, p_apartment_id: apartmentId });
  if (error || !data.ok) { showToast((data && data.error) || 'Errore, riprova.'); return; }
  showToast('Prenotazione inviata! Attendi la conferma della direzione.');
  loadMyBooking();
  loadAvailable();
}

loadMyBooking();
loadAvailable();
window.addEventListener('pageshow', (e) => { if (e.persisted) { loadMyBooking(); loadAvailable(); } });