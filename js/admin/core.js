// Admin dashboard core: session guard, shared state, storage, DOM helpers,
// section switching, and the data-action click registry used by all modules.
// Loaded first; the other js/admin/* modules attach to window.DIPCC_ADMIN.
(function () {
  'use strict';

  var utils = window.DIPCC_UTILS;

  function isAdminSession() {
    try {
      return sessionStorage.getItem('dipcc_role') === 'admin';
    } catch (error) {
      return false;
    }
  }

  // Without an admin session the namespace stays undefined, so every other
  // admin module bails out and the browser navigates to the login page.
  if (!isAdminSession()) {
    window.location.replace('login.html');
    return;
  }

  var config = {
    STORAGE_KEY: 'dipcc_admin_draft',
    TOKEN_KEY: 'dipcc_github_token',
    CLASSROOM_CONFIG_KEY: 'dipcc_classroom_config',
    CLASSROOM_SECRET_KEY: 'dipcc_classroom_secret',
    REPO: 'dipccclassroom/info.github.io',
    DATA_FILE: 'data.js',
    DEFAULT_QR_CODE: { imageSrc: 'qr-code.svg', linkUrl: 'https://t.me/AccesSureBot' },
    QR_IMAGE_MAX_BYTES: 500 * 1024,
    SECTION_NAMES: ['schedule', 'lessons', 'dates', 'contacts', 'qr', 'classroom', 'publish']
  };

  function normalizeData(data) {
    data = data || {};
    var qrCode = data.qrCode || {};
    return {
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
      lessons: Array.isArray(data.lessons) ? data.lessons : [],
      dates: Array.isArray(data.dates) ? data.dates : [],
      contacts: Array.isArray(data.contacts) ? data.contacts : [],
      qrCode: {
        imageSrc: typeof qrCode.imageSrc === 'string' && qrCode.imageSrc ? qrCode.imageSrc : config.DEFAULT_QR_CODE.imageSrc,
        linkUrl: typeof qrCode.linkUrl === 'string' && qrCode.linkUrl ? qrCode.linkUrl : config.DEFAULT_QR_CODE.linkUrl
      }
    };
  }

  function loadInitialContent() {
    try {
      var draft = localStorage.getItem(config.STORAGE_KEY);
      if (draft) return normalizeData(JSON.parse(draft));
    } catch (error) {
      localStorage.removeItem(config.STORAGE_KEY);
    }

    return normalizeData(utils.clone(window.DIPCC_DATA || window.DIPCC_DEFAULT_DATA));
  }

  var admin = {
    config: config,
    content: loadInitialContent(),
    actions: {},
    normalizeData: normalizeData
  };

  admin.saveDraft = function () {
    localStorage.setItem(config.STORAGE_KEY, JSON.stringify(admin.content));
  };

  admin.setStatus = function (name, message, kind) {
    var element = document.getElementById('status-' + name);
    if (!element) return;

    element.style.display = 'block';
    element.style.color = kind === 'error' ? '#f85149' : '#3fb950';
    element.textContent = message;

    if (name !== 'publish' && name !== 'classroom') {
      window.setTimeout(function () {
        element.style.display = 'none';
      }, 3000);
    }
  };

  admin.getSessionItem = function (key) {
    try {
      return sessionStorage.getItem(key) || '';
    } catch (error) {
      return '';
    }
  };

  admin.setSessionItem = function (key, value) {
    try {
      if (value) {
        sessionStorage.setItem(key, value);
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      // Session persistence is a convenience only; publishing can still proceed.
    }
  };

  admin.createCell = function (child) {
    var cell = document.createElement('td');
    cell.appendChild(child);
    return cell;
  };

  admin.createInput = function (value, onChange, type) {
    var input = document.createElement('input');
    input.type = type || 'text';
    input.value = value || '';
    input.addEventListener('input', function () {
      onChange(input.value);
      admin.saveDraft();
    });
    return input;
  };

  admin.createTextarea = function (value, onChange) {
    var textarea = document.createElement('textarea');
    textarea.value = value || '';
    textarea.addEventListener('input', function () {
      onChange(textarea.value);
      admin.saveDraft();
    });
    return textarea;
  };

  admin.createDeleteButton = function (label, onClick) {
    var button = document.createElement('button');
    button.className = 'del-btn';
    button.type = 'button';
    button.textContent = label || 'x';
    button.addEventListener('click', function () {
      onClick();
      admin.saveDraft();
    });
    return button;
  };

  admin.createFieldGroup = function (labelText, control) {
    var group = document.createElement('div');
    group.className = 'field-group';

    var label = document.createElement('label');
    label.textContent = labelText;

    group.append(label, control);
    return group;
  };

  function showSection(name) {
    config.SECTION_NAMES.forEach(function (sectionName) {
      var section = document.getElementById('section-' + sectionName);
      if (section) section.style.display = sectionName === name ? '' : 'none';
    });

    document.querySelectorAll('.sidebar-btn').forEach(function (button) {
      button.classList.toggle('active', button.dataset.section === name);
    });
  }

  admin.actions['show-section'] = function (element) {
    showSection(element.dataset.section);
  };

  admin.actions['save-section'] = function (element) {
    admin.saveDraft();
    admin.setStatus(element.dataset.section, 'Saved locally. Use View Site to preview, then Publish to deploy.', 'success');
  };

  admin.actions.logout = function () {
    try {
      sessionStorage.clear();
    } catch (error) {
      // Ignore storage cleanup failures and still leave the admin surface.
    }
    window.location.href = 'login.html';
  };

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    var action = admin.actions[trigger.dataset.action];
    if (action) action(trigger, event);
  });

  window.DIPCC_ADMIN = admin;
})();
