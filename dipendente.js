const steps = {
  login: document.getElementById('step-login'),
  success: document.getElementById('step-success'),
};

function showStep(name) {
  Object.values(steps).forEach(s => s.classList.add('is-hidden'));
  steps[name].classList.remove('is-hidden');
}

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
  void el.offsetWidth;
  el.closest('.auth-step').classList.add('shake');
}

function saveEmployeeSession(data) {
  localStorage.setItem('atlas_employee', JSON.stringify(data));
}

document.getElementById('step-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');
  errorEl.classList.add('is-hidden');

  const nickname = document.getElementById('login-nickname').value.trim();
  const password = document.getElementById('login-password').value;

  setLoading(submitBtn, true);
  const { data, error } = await supabaseClient.rpc('login_employee', {
    p_nickname: nickname, p_password: password
  });
  setLoading(submitBtn, false);

  if (error) return showError(errorEl, 'Errore di connessione. Riprova.');
  if (!data.ok) return showError(errorEl, data.error);

  saveEmployeeSession({ id: data.id, nickname: data.nickname, role: data.role, settori: data.settori || [] });

  document.getElementById('success-message').textContent = `Bentornato, ${data.nickname} (${data.role})`;
  showStep('success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
});