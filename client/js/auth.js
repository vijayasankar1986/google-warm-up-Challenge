/**
 * Auth page logic — Login & Register
 */
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (API.getToken()) {
    window.location.href = '/dashboard.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegister = document.getElementById('showRegister');
  const showLogin = document.getElementById('showLogin');
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginPanel.classList.add('hidden');
    registerPanel.classList.remove('hidden');
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const btn = loginForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const data = await API.post('/auth/login', {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
      });
      API.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
      window.location.href = '/dashboard.html';
    } catch (err) {
      loginError.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    const btn = registerForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const data = await API.post('/auth/register', {
        tenantName: document.getElementById('regTenant').value,
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
      });
      API.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
      window.location.href = '/dashboard.html';
    } catch (err) {
      registerError.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
});
