// ---------- Elements ----------
const steps = {
  choice: document.getElementById('step-choice'),
  login: document.getElementById('step-login'),
  register: document.getElementById('step-register'),
  success: document.getElementById('step-success'),
};

const showStep = (name) => {
  Object.values(steps).forEach(s => s.classList.add('is-hidden'));
  steps[name].classList.remove('is-hidden');
};

document.getElementById('go-login').addEventListener('click', () => showStep('login'));
document.getElementById('go-register').addEventListener('click', () => showStep('register'));
document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showStep('choice'));
});

// ---------- Helpers ----------
function setLoading(button, isLoading) {
  const spinner = button.querySelector('.spinner');
  const label = button.querySelector('span:not(.spinner)');
  button.disabled = isLoading;
  if (isLoading) {
    spinner.classList.remove('is-hidden');
    label.style.opacity = '0.6';
  } else {
    spinner.classList.add('is-hidden');
    label.style.opacity = '1';
  }
}

function showError(el, message) {
  el.textContent = message;
  el.classList.remove('is-hidden');
  el.closest('.auth-step').classList.remove('shake');
  void el.offsetWidth; // restart animation
  el.closest('.auth-step').classList.add('shake');
}

function goToSuccess(message, redirectUrl) {
  document.getElementById('success-message').textContent = message;
  showStep('success');
  setTimeout(() => { window.location.href = redirectUrl; }, 1200);
}

function saveCustomerSession(data) {
  localStorage.setItem('atlas_customer', JSON.stringify(data));
}

// ---------- Login ----------
document.getElementById('step-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');
  errorEl.classList.add('is-hidden');

  const nickname = document.getElementById('login-nickname').value.trim();
  const password = document.getElementById('login-password').value;

  setLoading(submitBtn, true);
  const { data, error } = await supabaseClient.rpc('login_customer', {
    p_nickname: nickname, p_password: password
  });
  setLoading(submitBtn, false);

  if (error) return showError(errorEl, 'Errore di connessione. Riprova.');
  if (!data.ok) return showError(errorEl, data.error);

  saveCustomerSession({ id: data.id, nickname: data.nickname, telegram: data.telegram });
  goToSuccess(`Bentornato, ${data.nickname}!`, 'shop.html');
});

// ---------- Register ----------
document.getElementById('step-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-submit');
  errorEl.classList.add('is-hidden');

  const nickname = document.getElementById('reg-nickname').value.trim();
  let telegram = document.getElementById('reg-telegram').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!telegram.startsWith('@')) telegram = '@' + telegram;

  setLoading(submitBtn, true);
  const { data, error } = await supabaseClient.rpc('register_customer', {
    p_nickname: nickname, p_password: password, p_telegram: telegram
  });
  setLoading(submitBtn, false);

  if (error) return showError(errorEl, 'Errore di connessione. Riprova.');
  if (!data.ok) return showError(errorEl, data.error);

  saveCustomerSession({ id: data.id, nickname, telegram });
  goToSuccess('Account creato con successo!', 'shop.html');
});
