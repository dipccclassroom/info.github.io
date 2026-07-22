// Shared helpers used by both the public site and the admin dashboard.
(function (window) {
  'use strict';

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function splitLines(value) {
    return String(value || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  // Only http(s) links may be rendered as clickable URLs.
  function safeLinkUrl(value) {
    try {
      var url = new URL(String(value || '').trim(), window.location.href);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  // Image sources may be base64 data URIs, relative paths, or http(s) URLs.
  function safeImageSource(value) {
    value = String(value || '').trim();
    if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,/i.test(value)) return value;
    if (value && !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith('//')) return value;

    try {
      var url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  window.DIPCC_UTILS = {
    clone: clone,
    splitLines: splitLines,
    safeLinkUrl: safeLinkUrl,
    safeImageSource: safeImageSource
  };
})(window);
