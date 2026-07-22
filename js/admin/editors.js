// Content editors: schedule table (+ CSV import), lessons, dates, contacts,
// and the QR code image/link editor.
(function () {
  'use strict';

  var admin = window.DIPCC_ADMIN;
  if (!admin) return;

  var utils = window.DIPCC_UTILS;
  var csv = admin.csv;
  var content = admin.content;

  /* ----- Schedule ----- */

  var SCHEDULE_FIELDS = ['day', 'time', 'subject', 'teacher', 'room'];
  var SCHEDULE_HEADER_MAP = {
    day: 'day',
    weekday: 'day',
    time: 'time',
    subject: 'subject',
    class: 'subject',
    course: 'subject',
    teacher: 'teacher',
    instructor: 'teacher',
    room: 'room',
    classroom: 'room'
  };

  function rowsToSchedule(rows) {
    if (!rows.length) return [];

    var mapped = csv.mapColumns(rows, SCHEDULE_FIELDS, SCHEDULE_HEADER_MAP);
    return mapped.dataRows.map(function (row) {
      return {
        day: csv.getField(row, mapped.indexes, 'day'),
        time: csv.getField(row, mapped.indexes, 'time'),
        subject: csv.getField(row, mapped.indexes, 'subject'),
        teacher: csv.getField(row, mapped.indexes, 'teacher'),
        room: csv.getField(row, mapped.indexes, 'room')
      };
    }).filter(function (entry) {
      return entry.day || entry.time || entry.subject || entry.teacher || entry.room;
    });
  }

  function renderSchedule() {
    var body = document.getElementById('schedule-body');
    if (!body) return;

    body.replaceChildren();
    content.schedule.forEach(function (row, index) {
      var tr = document.createElement('tr');
      SCHEDULE_FIELDS.forEach(function (field) {
        tr.appendChild(admin.createCell(admin.createInput(row[field], function (value) {
          content.schedule[index][field] = value;
        })));
      });

      tr.appendChild(admin.createCell(admin.createDeleteButton('x', function () {
        content.schedule.splice(index, 1);
        renderSchedule();
      })));
      body.appendChild(tr);
    });
  }

  async function importScheduleCsv() {
    var modeInput = document.getElementById('schedule-import-mode');

    try {
      var rows = await csv.readFile(document.getElementById('schedule-csv'));
      var importedRows = rowsToSchedule(rows);
      if (!importedRows.length) {
        admin.setStatus('schedule-import', 'No schedule rows found in that CSV.', 'error');
        return;
      }

      if (modeInput && modeInput.value === 'append') {
        content.schedule = content.schedule.concat(importedRows);
      } else {
        content.schedule = importedRows;
      }

      admin.saveDraft();
      renderSchedule();
      admin.setStatus('schedule-import', 'Imported ' + importedRows.length + ' schedule rows. Preview or publish when ready.', 'success');
    } catch (error) {
      admin.setStatus('schedule-import', 'Could not import CSV: ' + error.message, 'error');
    }
  }

  function downloadScheduleTemplate() {
    var rows = [SCHEDULE_FIELDS]
      .concat((content.schedule.length ? content.schedule : [
        { day: 'Monday', time: '09:00-10:30', subject: 'Mathematics', teacher: 'Prof. Smith', room: '101' }
      ]).map(function (row) {
        return [row.day, row.time, row.subject, row.teacher, row.room];
      }));
    csv.download('schedule-template.csv', rows);
  }

  admin.actions['add-schedule-row'] = function () {
    content.schedule.push({ day: '', time: '', subject: '', teacher: '', room: '' });
    admin.saveDraft();
    renderSchedule();
  };
  admin.actions['import-schedule-csv'] = importScheduleCsv;
  admin.actions['download-schedule-template'] = downloadScheduleTemplate;

  /* ----- Lessons ----- */

  function renderLessons() {
    var list = document.getElementById('lessons-list');
    if (!list) return;

    list.replaceChildren();
    content.lessons.forEach(function (lesson, index) {
      var card = document.createElement('div');
      card.className = 'lesson-card';

      var header = document.createElement('div');
      header.className = 'card-header';

      var label = document.createElement('strong');
      label.style.color = '#c9d1d9';
      label.textContent = 'Lesson ' + (index + 1);

      header.append(label, admin.createDeleteButton('Remove', function () {
        content.lessons.splice(index, 1);
        renderLessons();
      }));

      var subjectGroup = admin.createFieldGroup('Subject', admin.createInput(lesson.subject, function (value) {
        content.lessons[index].subject = value;
      }));

      var topicsGroup = admin.createFieldGroup('Topics', admin.createTextarea((lesson.topics || []).join('\n'), function (value) {
        content.lessons[index].topics = utils.splitLines(value);
      }));

      card.append(header, subjectGroup, topicsGroup);
      list.appendChild(card);
    });
  }

  admin.actions['add-lesson'] = function () {
    content.lessons.push({ subject: 'New Lesson', topics: [] });
    admin.saveDraft();
    renderLessons();
  };

  /* ----- Important dates ----- */

  function renderDates() {
    var body = document.getElementById('dates-body');
    if (!body) return;

    body.replaceChildren();
    content.dates.forEach(function (row, index) {
      var tr = document.createElement('tr');
      tr.appendChild(admin.createCell(admin.createInput(row.date, function (value) {
        content.dates[index].date = value;
      })));
      tr.appendChild(admin.createCell(admin.createInput(row.event, function (value) {
        content.dates[index].event = value;
      })));

      var highlight = document.createElement('select');
      ['standard', 'highlight'].forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value === 'highlight' ? 'Highlight' : 'Standard';
        option.selected = Boolean(row.highlight) === (value === 'highlight');
        highlight.appendChild(option);
      });
      highlight.addEventListener('change', function () {
        content.dates[index].highlight = highlight.value === 'highlight';
        admin.saveDraft();
      });
      tr.appendChild(admin.createCell(highlight));

      tr.appendChild(admin.createCell(admin.createDeleteButton('x', function () {
        content.dates.splice(index, 1);
        renderDates();
      })));
      body.appendChild(tr);
    });
  }

  admin.actions['add-date-row'] = function () {
    content.dates.push({ date: '', event: '', highlight: false });
    admin.saveDraft();
    renderDates();
  };

  /* ----- Contacts ----- */

  function formatLinks(links) {
    return (links || []).map(function (link) {
      return [link.label || '', link.url || '#'].join('|');
    }).join('\n');
  }

  function parseLinks(value) {
    return utils.splitLines(value).map(function (line) {
      var parts = line.split('|');
      var label = (parts.shift() || '').trim();
      var url = (parts.join('|') || '#').trim();
      return { label: label || url, url: url || '#' };
    });
  }

  function renderContacts() {
    var list = document.getElementById('contacts-list');
    if (!list) return;

    list.replaceChildren();
    content.contacts.forEach(function (contact, index) {
      var card = document.createElement('div');
      card.className = 'contact-card';

      var header = document.createElement('div');
      header.className = 'card-header';

      var label = document.createElement('strong');
      label.style.color = '#c9d1d9';
      label.textContent = 'Contact ' + (index + 1);

      header.append(label, admin.createDeleteButton('Remove', function () {
        content.contacts.splice(index, 1);
        renderContacts();
      }));

      var grid = document.createElement('div');
      grid.className = 'grid-2';
      grid.append(
        admin.createFieldGroup('Title', admin.createInput(contact.title, function (value) {
          content.contacts[index].title = value;
        })),
        admin.createFieldGroup('Icon', admin.createInput(contact.icon, function (value) {
          content.contacts[index].icon = value;
        })),
        admin.createFieldGroup('Details', admin.createTextarea((contact.details || []).join('\n'), function (value) {
          content.contacts[index].details = utils.splitLines(value);
        })),
        admin.createFieldGroup('Links (label|url)', admin.createTextarea(formatLinks(contact.links), function (value) {
          content.contacts[index].links = parseLinks(value);
        }))
      );

      card.append(header, grid);
      list.appendChild(card);
    });
  }

  admin.actions['add-contact'] = function () {
    content.contacts.push({ title: 'New Contact', icon: '', details: [], links: [] });
    admin.saveDraft();
    renderContacts();
  };

  /* ----- QR code ----- */

  function updateQrPreview() {
    var image = document.getElementById('qr-admin-preview-image');
    var link = document.getElementById('qr-admin-preview-link');
    if (!image || !link) return;

    image.src = content.qrCode.imageSrc;
    var linkUrl = utils.safeLinkUrl(content.qrCode.linkUrl);
    if (linkUrl) {
      link.href = linkUrl;
      link.removeAttribute('aria-disabled');
    } else {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
    }
  }

  function setupQrEditor() {
    var linkInput = document.getElementById('qr-link-url');
    var fileInput = document.getElementById('qr-image-file');
    if (!linkInput || !fileInput) return;

    linkInput.value = content.qrCode.linkUrl;
    linkInput.addEventListener('input', function () {
      content.qrCode.linkUrl = linkInput.value.trim();
      admin.saveDraft();
      updateQrPreview();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      var allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
      if (allowedTypes.indexOf(file.type) === -1) {
        admin.setStatus('qr', 'Choose an SVG, PNG, JPEG, or WebP image.', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > admin.config.QR_IMAGE_MAX_BYTES) {
        admin.setStatus('qr', 'That image is larger than 500 KB. Choose a smaller QR image.', 'error');
        fileInput.value = '';
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        content.qrCode.imageSrc = String(reader.result || '');
        admin.saveDraft();
        updateQrPreview();
        admin.setStatus('qr', 'QR image updated locally. Preview it, then publish when ready.', 'success');
      };
      reader.onerror = function () {
        admin.setStatus('qr', 'Could not read that image file.', 'error');
      };
      reader.readAsDataURL(file);
    });

    updateQrPreview();
  }

  admin.actions['reset-qr'] = function () {
    content.qrCode = utils.clone(admin.config.DEFAULT_QR_CODE);
    admin.saveDraft();
    var linkInput = document.getElementById('qr-link-url');
    var fileInput = document.getElementById('qr-image-file');
    if (linkInput) linkInput.value = content.qrCode.linkUrl;
    if (fileInput) fileInput.value = '';
    updateQrPreview();
    admin.setStatus('qr', 'Restored the included QR image and link.', 'success');
  };

  /* ----- Initial render ----- */

  renderSchedule();
  renderLessons();
  renderDates();
  renderContacts();
  setupQrEditor();
})();
