// ---------- Sessione: se già loggato, i pulsanti portano direttamente
// allo spazio corrispondente invece che al login ----------
const customerRaw = localStorage.getItem('atlas_customer');
const employeeRaw = localStorage.getItem('atlas_employee');
const loggedCustomer = customerRaw ? JSON.parse(customerRaw) : null;
const loggedEmployee = employeeRaw ? JSON.parse(employeeRaw) : null;

const goCliente = () => window.location.href = loggedCustomer ? 'shop.html' : 'cliente.html';
const goDipendente = () => window.location.href = loggedEmployee ? 'dashboard.html' : 'dipendente.html';

['btn-cliente', 'btn-cliente-2', 'btn-cliente-3'].forEach(id => {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('click', goCliente);
  if (loggedCustomer) {
    const span = btn.querySelector('span');
    const label = `Bentornato, ${loggedCustomer.nickname}`;
    if (span) span.textContent = label; else btn.textContent = label;
  }
});

['btn-dipendente', 'btn-dipendente-2'].forEach(id => {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('click', goDipendente);
  if (loggedEmployee) {
    const span = btn.querySelector('span');
    const label = `Bentornato, ${loggedEmployee.nickname}`;
    if (span) span.textContent = label; else btn.textContent = label;
  }
});

// ---------- Animated stat counters ----------
const animateCount = (el) => {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1400;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.6 });

document.querySelectorAll('.stat-num').forEach(el => statObserver.observe(el));

// ---------- Reveal on scroll for elements below the fold ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.departments .reveal, .cta-band.reveal').forEach(el => {
  el.style.animationPlayState = 'paused';
  revealObserver.observe(el);
});

// ---------- Subtle 3D tilt on department cards ----------
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -8;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
  });
});
