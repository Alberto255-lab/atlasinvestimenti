const employeeRaw = localStorage.getItem('atlas_employee');
if (!employeeRaw) window.location.href = 'dipendente.html';
const employee = JSON.parse(employeeRaw || '{}');
document.getElementById('role-pill').textContent = employee.role || '—';

const loadingEl = document.getElementById('orders-loading');
const emptyEl = document.getElementById('orders-empty');
const listEl = document.getElementById('orders-list');

async function loadOrders() {
  const { data, error } = await supabaseClient.rpc('get_orders');
  loadingEl.classList.add('is-hidden');

  if (error || !data || data.length === 0) {
    emptyEl.classList.remove('is-hidden');
    return;
  }

  listEl.classList.remove('is-hidden');
  listEl.innerHTML = data.map(orderCardHtml).join('');

  data.forEach(o => {
    if (o.status !== 'gestito') {
      document.getElementById(`mark-${o.id}`)?.addEventListener('click', () => markHandled(o.id));
    }
    document.getElementById(`del-${o.id}`)?.addEventListener('click', () => deleteOrder(o.id));
  });
}

function orderCardHtml(o) {
  const isNew = o.status !== 'gestito';
  const date = new Date(o.created_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `
    <div class="order-card reveal ${isNew ? 'is-new' : ''}">
      <div class="order-main">
        <span class="order-product">${o.product_name}</span>
        <span class="order-customer"><strong>${o.customer_nickname}</strong> — ${o.customer_telegram}</span>
      </div>
      <div class="order-right">
        <span class="order-price">€ ${Number(o.product_price).toFixed(2)}</span>
        <span class="order-date">${date}</span>
        <span class="order-status ${isNew ? 'status-nuovo' : 'status-gestito'}">${isNew ? 'Nuovo' : 'Gestito'}</span>
        ${isNew ? `<button class="mark-btn" id="mark-${o.id}">Segna come gestito</button>` : ''}
        <button class="mark-btn danger" id="del-${o.id}">Elimina</button>
      </div>
    </div>
  `;
}

async function markHandled(orderId) {
  await supabaseClient.rpc('mark_order_handled', { p_order_id: orderId });
  loadOrders();
}

async function deleteOrder(orderId) {
  await supabaseClient.rpc('delete_order', { p_order_id: orderId });
  loadOrders();
}

loadOrders();
