// Publishing: serializes the draft into data.js and commits it to GitHub via
// the contents API; GitHub Actions then redeploys the site.
(function () {
  'use strict';

  var admin = window.DIPCC_ADMIN;
  if (!admin) return;

  var utils = window.DIPCC_UTILS;
  var config = admin.config;

  // Output must stay a plain script that defines the DIPCC_* globals, because
  // index.html and admin.html load data.js before any other site code.
  function buildDataFile(data) {
    var existingLocalizedData = window.DIPCC_LOCALIZED_DATA || {};
    var ukData = admin.normalizeData(data);
    var enData = admin.normalizeData(existingLocalizedData.en || data);
    enData.qrCode = utils.clone(ukData.qrCode);
    var localizedData = {
      en: enData,
      uk: ukData
    };

    return [
      '(function (window) {',
      "  'use strict';",
      '',
      '  var localizedData = ' + JSON.stringify(localizedData, null, 2).replace(/\n/g, '\n  ') + ';',
      '  var data = localizedData.uk;',
      '',
      '  window.DIPCC_LOCALIZED_DATA = localizedData;',
      '  window.DIPCC_DEFAULT_DATA = data;',
      '  window.DIPCC_DATA = data;',
      '})(window);',
      ''
    ].join('\n');
  }

  function decodeBase64Unicode(value) {
    var binary = atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Unicode(value) {
    var bytes = new TextEncoder().encode(value);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function publishChanges() {
    var tokenInput = document.getElementById('gh-token');
    var rememberInput = document.getElementById('remember-gh-token');
    var token = (tokenInput ? tokenInput.value.trim() : '') || admin.getSessionItem(config.TOKEN_KEY);
    var message = document.getElementById('commit-msg').value.trim() || 'Admin: Update content via dashboard';

    if (!token) {
      admin.setStatus('publish', 'Please enter your GitHub token.', 'error');
      return;
    }

    admin.setSessionItem(config.TOKEN_KEY, rememberInput && rememberInput.checked ? token : '');
    admin.setStatus('publish', 'Fetching current data.js...', 'success');

    try {
      var fileResponse = await fetch('https://api.github.com/repos/' + config.REPO + '/contents/' + config.DATA_FILE, {
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!fileResponse.ok) throw new Error('Failed to fetch data.js: ' + fileResponse.status);

      var fileData = await fileResponse.json();
      decodeBase64Unicode(fileData.content.replace(/\n/g, ''));

      admin.setStatus('publish', 'Pushing content update to GitHub...', 'success');
      var updateResponse = await fetch('https://api.github.com/repos/' + config.REPO + '/contents/' + config.DATA_FILE, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          content: encodeBase64Unicode(buildDataFile(admin.content)),
          sha: fileData.sha,
          branch: 'main'
        })
      });

      if (!updateResponse.ok) {
        var errorBody = await updateResponse.json();
        throw new Error(errorBody.message || 'Failed to publish changes.');
      }

      admin.setStatus('publish', 'Published. GitHub Pages will deploy the update shortly.', 'success');
    } catch (error) {
      admin.setStatus('publish', 'Error: ' + error.message, 'error');
    }
  }

  function hydratePublishForm() {
    var tokenInput = document.getElementById('gh-token');
    var rememberInput = document.getElementById('remember-gh-token');
    var savedToken = admin.getSessionItem(config.TOKEN_KEY);

    if (tokenInput && savedToken) tokenInput.value = savedToken;
    if (rememberInput) rememberInput.checked = Boolean(savedToken) || rememberInput.checked;
  }

  admin.actions['publish-changes'] = publishChanges;

  hydratePublishForm();
})();
