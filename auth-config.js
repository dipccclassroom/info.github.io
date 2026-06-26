// Auth configuration - injected by the GitHub Pages deployment workflow.
// Defaults are SHA-256 hashes for admin=admin123 and viewer=viewer123.
// To change passwords: update ADMIN_PASSWORD_HASH and VIEWER_PASSWORD_HASH in repo secrets.
(function (window) {
  'use strict';

  var defaultAdminHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  var defaultViewerHash = '65375049b9e4d7cad6c9ba286fdeb9394b28135a3e84136404cfccfdcc438894';
  var injectedAdminHash = '__ADMIN_HASH__';
  var injectedViewerHash = '__VIEWER_HASH__';
  var hashPattern = /^[a-f0-9]{64}$/i;

  window.ADMIN_HASH = hashPattern.test(injectedAdminHash) ? injectedAdminHash : defaultAdminHash;
  window.VIEWER_HASH = hashPattern.test(injectedViewerHash) ? injectedViewerHash : defaultViewerHash;
})(window);
