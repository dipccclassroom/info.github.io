// Login page: role selection and password check against the injected hashes.
(function () {
  'use strict';

  var currentRole = 'viewer';

  function setRole(role) {
    currentRole = role;
    document.querySelectorAll('.role-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.role === role);
    });
  }

  async function sha256(value) {
    var buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(buffer)).map(function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  async function doLogin() {
    var password = document.getElementById('password').value;
    if (!password) return;

    var hash = await sha256(password);
    var adminHash = window.ADMIN_HASH || '';
    var viewerHash = window.VIEWER_HASH || '';

    if (currentRole === 'admin' && hash === adminHash) {
      sessionStorage.setItem('dipcc_role', 'admin');
      sessionStorage.setItem('dipcc_auth', '1');
      window.location.href = 'admin.html';
    } else if (currentRole === 'viewer' && hash === viewerHash) {
      sessionStorage.setItem('dipcc_role', 'viewer');
      sessionStorage.setItem('dipcc_auth', '1');
      window.location.href = 'index.html';
    } else {
      document.getElementById('error-msg').style.display = 'block';
    }
  }

  document.querySelectorAll('.role-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      setRole(tab.dataset.role);
    });
  });

  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('password').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') doLogin();
  });

  if (sessionStorage.getItem('dipcc_auth') === '1') {
    var role = sessionStorage.getItem('dipcc_role');
    window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
  }
})();
