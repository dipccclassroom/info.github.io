// Auth configuration - injected by CI/CD build pipeline
// Hashes are SHA-256 of passwords, set via GitHub Secrets
// Default hashes: admin=admin123, viewer=viewer123
// To change passwords: update ADMIN_PASSWORD_HASH and VIEWER_PASSWORD_HASH in repo secrets
// Passwords last updated: 2026-06-26
window.ADMIN_HASH = '__ADMIN_HASH__';
window.VIEWER_HASH = '__VIEWER_HASH__';
