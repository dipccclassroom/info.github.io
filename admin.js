(function () {
  'use strict';

  var STORAGE_KEY = 'dipcc_admin_draft';
  var REPO = 'dipccclassroom/info.github.io';
  var DATA_FILE = 'data.js';
  var SECTION_NAMES = ['schedule', 'lessons', 'dates', 'contacts', 'publish'];
  var content = loadInitialContent();

  if (!isAdminSession()) {
    window.location.replace('login.html');
    return;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function normalizeData(data) {
    data = data || {};
    return {
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
      lessons: Array.isArray(data.lessons) ? data.lessons : [],
      dates: Array.isArray(data.dates) ? data.dates : [],
      contacts: Array.isArray(data.contacts) ? data.contacts : []
    };
  }

  function loadInitialContent() {
    try {
      var draft = localStorage.getItem(STORAGE_KEY);
      if (draft) return normalizeData(JSON.parse(draft));
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }

    return normalizeData(clone(window.DIPCC_DATA || window.DIPCC_DEFAULT_DATA));
  }

  function isAdminSession() {
    try {
      return sessionStorage.getItem('dipcc_role') === 'admin';
    } catch (error) {
      return false;
    }
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }

  function setStatus(name, message, kind) {
    var element = document.getElementById('status-' + name);
    if (!element) return;

    element.style.display = 'block';
    element.style.color = kind === 'error' ? '#f85149' : '#3fb950';
    element.textContent = message;

    if (name !== 'publish') {
      window.setTimeout(function () {
        element.style.display = 'none';
      }, 3000);
    }
  }

  function createCell(child) {
    var cell = document.createElement('td');
    cell.appendChild(child);
    return cell;
  }

  function createInput(value, onChange, type) {
    var input = document.createElement('input');
    input.type = type || 'text';
    input.value = value || '';
    input.addEventListener('input', function () {
      onChange(input.value);
      saveDraft();
    });
    return input;
  }

  function createTextarea(value, onChange) {
    var textarea = document.createElement('textarea');
    textarea.value = value || '';
    textarea.addEventListener('input', function () {
      onChange(textarea.value);
      saveDraft();
    });
    return textarea;
  }

  function createDeleteButton(label, onClick) {
    var button = document.createElement('button');
    button.className = 'del-btn';
    button.type = 'button';
    button.textContent = label || 'x';
    button.addEventListener('click', function () {
      onClick();
      saveDraft();
    });
    return button;
  }

  function splitLines(value) {
    return String(value || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function formatLinks(links) {
    return (links || []).map(function (link) {
      return [link.label || '', link.url || '#'].join('|');
    }).join('\n');
  }

  function parseLinks(value) {
    return splitLines(value).map(function (line) {
      var parts = line.split('|');
      var label = (parts.shift() || '').trim();
      var url = (parts.join('|') || '#').trim();
      return { label: label || url, url: url || '#' };
    });
  }

  function renderSchedule() {
    var body = document.getElementById('schedule-body');
    if (!body) return;

    body.replaceChildren();
    content.schedule.forEach(function (row, index) {
      var tr = document.createElement('tr');
      ['day', 'time', 'subject', 'teacher', 'room'].forEach(function (field) {
        tr.appendChild(createCell(createInput(row[field], function (value) {
          content.schedule[index][field] = value;
        })));
      });

      tr.appendChild(createCell(createDeleteButton('x', function () {
        content.schedule.splice(index, 1);
        renderSchedule();
      })));
      body.appendChild(tr);
    });
  }

  function addScheduleRow() {
    content.schedule.push({ day: '', time: '', subject: '', teacher: '', room: '' });
    saveDraft();
    renderSchedule();
  }

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

      header.append(label, createDeleteButton('Remove', function () {
        content.lessons.splice(index, 1);
        renderLessons();
      }));

      var subjectGroup = createFieldGroup('Subject', createInput(lesson.subject, function (value) {
        content.lessons[index].subject = value;
      }));

      var topicsGroup = createFieldGroup('Topics', createTextarea((lesson.topics || []).join('\n'), function (value) {
        content.lessons[index].topics = splitLines(value);
      }));

      card.append(header, subjectGroup, topicsGroup);
      list.appendChild(card);
    });
  }

  function addLesson() {
    content.lessons.push({ subject: 'New Lesson', topics: [] });
    saveDraft();
    renderLessons();
  }

  function renderDates() {
    var body = document.getElementById('dates-body');
    if (!body) return;

    body.replaceChildren();
    content.dates.forEach(function (row, index) {
      var tr = document.createElement('tr');
      tr.appendChild(createCell(createInput(row.date, function (value) {
        content.dates[index].date = value;
      })));
      tr.appendChild(createCell(createInput(row.event, function (value) {
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
        saveDraft();
      });
      tr.appendChild(createCell(highlight));

      tr.appendChild(createCell(createDeleteButton('x', function () {
        content.dates.splice(index, 1);
        renderDates();
      })));
      body.appendChild(tr);
    });
  }

  function addDateRow() {
    content.dates.push({ date: '', event: '', highlight: false });
    saveDraft();
    renderDates();
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

      header.append(label, createDeleteButton('Remove', function () {
        content.contacts.splice(index, 1);
        renderContacts();
      }));

      var grid = document.createElement('div');
      grid.className = 'grid-2';
      grid.append(
        createFieldGroup('Title', createInput(contact.title, function (value) {
          content.contacts[index].title = value;
        })),
        createFieldGroup('Icon', createInput(contact.icon, function (value) {
          content.contacts[index].icon = value;
        })),
        createFieldGroup('Details', createTextarea((contact.details || []).join('\n'), function (value) {
          content.contacts[index].details = splitLines(value);
        })),
        createFieldGroup('Links (label|url)', createTextarea(formatLinks(contact.links), function (value) {
          content.contacts[index].links = parseLinks(value);
        }))
      );

      card.append(header, grid);
      list.appendChild(card);
    });
  }

  function addContact() {
    content.contacts.push({ title: 'New Contact', icon: '', details: [], links: [] });
    saveDraft();
    renderContacts();
  }

  function createFieldGroup(labelText, control) {
    var group = document.createElement('div');
    group.className = 'field-group';

    var label = document.createElement('label');
    label.textContent = labelText;

    group.append(label, control);
    return group;
  }

  function showSection(name) {
    SECTION_NAMES.forEach(function (sectionName, index) {
      var section = document.getElementById('section-' + sectionName);
      if (section) section.style.display = sectionName === name ? '' : 'none';

      var button = document.querySelectorAll('.sidebar-btn')[index];
      if (button) button.classList.toggle('active', sectionName === name);
    });
  }

  function saveSection(name) {
    saveDraft();
    setStatus(name, 'Saved locally. Use View Site to preview, then Publish to deploy.', 'success');
  }

  function buildDataFile(data) {
    return [
      '(function (window) {',
      "  'use strict';",
      '',
      '  var data = ' + JSON.stringify(normalizeData(data), null, 2).replace(/\n/g, '\n  ') + ';',
      '',
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
    var token = document.getElementById('gh-token').value.trim();
    var message = document.getElementById('commit-msg').value.trim() || 'Admin: Update content via dashboard';

    if (!token) {
      setStatus('publish', 'Please enter your GitHub token.', 'error');
      return;
    }

    setStatus('publish', 'Fetching current data.js...', 'success');

    try {
      var fileResponse = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + DATA_FILE, {
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!fileResponse.ok) throw new Error('Failed to fetch data.js: ' + fileResponse.status);

      var fileData = await fileResponse.json();
      decodeBase64Unicode(fileData.content.replace(/\n/g, ''));

      setStatus('publish', 'Pushing content update to GitHub...', 'success');
      var updateResponse = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + DATA_FILE, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          content: encodeBase64Unicode(buildDataFile(content)),
          sha: fileData.sha,
          branch: 'main'
        })
      });

      if (!updateResponse.ok) {
        var errorBody = await updateResponse.json();
        throw new Error(errorBody.message || 'Failed to publish changes.');
      }

      setStatus('publish', 'Published. GitHub Pages will deploy the update shortly.', 'success');
    } catch (error) {
      setStatus('publish', 'Error: ' + error.message, 'error');
    }
  }

  function logout() {
    try {
      sessionStorage.clear();
    } catch (error) {
      // Ignore storage cleanup failures and still leave the admin surface.
    }
    window.location.href = 'login.html';
  }

  function renderAll() {
    renderSchedule();
    renderLessons();
    renderDates();
    renderContacts();
  }

  window.showSection = showSection;
  window.addScheduleRow = addScheduleRow;
  window.addLesson = addLesson;
  window.addDateRow = addDateRow;
  window.addContact = addContact;
  window.saveSection = saveSection;
  window.publishChanges = publishChanges;
  window.logout = logout;

  renderAll();
})();
