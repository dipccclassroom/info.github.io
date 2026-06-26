(function () {
  'use strict';

  var STORAGE_KEY = 'dipcc_admin_draft';
  var TOKEN_KEY = 'dipcc_github_token';
  var CLASSROOM_CONFIG_KEY = 'dipcc_classroom_config';
  var CLASSROOM_SECRET_KEY = 'dipcc_classroom_secret';
  var REPO = 'dipccclassroom/info.github.io';
  var DATA_FILE = 'data.js';
  var SECTION_NAMES = ['schedule', 'lessons', 'dates', 'contacts', 'classroom', 'publish'];
  var CLASSROOM_BRIDGE_TIMEOUT_MS = 120000;
  var content = loadInitialContent();
  var classroomTasks = [];
  var classroomBridgeFrame = null;
  var classroomBridgeReadyUrl = '';

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

    if (name !== 'publish' && name !== 'classroom') {
      window.setTimeout(function () {
        element.style.display = 'none';
      }, 3000);
    }
  }

  function getSessionItem(key) {
    try {
      return sessionStorage.getItem(key) || '';
    } catch (error) {
      return '';
    }
  }

  function setSessionItem(key, value) {
    try {
      if (value) {
        sessionStorage.setItem(key, value);
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      // Session persistence is a convenience only; publishing can still proceed.
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

  function splitMultiValue(value) {
    return String(value || '')
      .split(/[;\n]/)
      .map(function (entry) { return entry.trim(); })
      .filter(Boolean);
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i += 1) {
      var char = text[i];
      var next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function normalizeCsvHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  }

  function rowsToSchedule(rows) {
    if (!rows.length) return [];

    var fields = ['day', 'time', 'subject', 'teacher', 'room'];
    var headers = rows[0].map(normalizeCsvHeader);
    var headerMap = {
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
    var indexes = {};
    var hasHeader = false;

    headers.forEach(function (header, index) {
      if (headerMap[header]) {
        indexes[headerMap[header]] = index;
        hasHeader = true;
      }
    });

    if (!hasHeader) {
      fields.forEach(function (field, index) {
        indexes[field] = index;
      });
    }

    var dataRows = hasHeader ? rows.slice(1) : rows;
    return dataRows.map(function (row) {
      return {
        day: row[indexes.day] || '',
        time: row[indexes.time] || '',
        subject: row[indexes.subject] || '',
        teacher: row[indexes.teacher] || '',
        room: row[indexes.room] || ''
      };
    }).filter(function (entry) {
      return entry.day || entry.time || entry.subject || entry.teacher || entry.room;
    });
  }

  function importScheduleCsv() {
    var fileInput = document.getElementById('schedule-csv');
    var modeInput = document.getElementById('schedule-import-mode');
    var file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!file) {
      setStatus('schedule-import', 'Choose a CSV file first.', 'error');
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var importedRows = rowsToSchedule(parseCsv(String(reader.result || '')));
        if (!importedRows.length) {
          setStatus('schedule-import', 'No schedule rows found in that CSV.', 'error');
          return;
        }

        if (modeInput && modeInput.value === 'append') {
          content.schedule = content.schedule.concat(importedRows);
        } else {
          content.schedule = importedRows;
        }

        saveDraft();
        renderSchedule();
        setStatus('schedule-import', 'Imported ' + importedRows.length + ' schedule rows. Preview or publish when ready.', 'success');
      } catch (error) {
        setStatus('schedule-import', 'Could not import CSV: ' + error.message, 'error');
      }
    };
    reader.onerror = function () {
      setStatus('schedule-import', 'Could not read that CSV file.', 'error');
    };
    reader.readAsText(file);
  }

  function csvEscape(value) {
    value = String(value || '');
    return /[",\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
  }

  function downloadScheduleTemplate() {
    var rows = [['day', 'time', 'subject', 'teacher', 'room']]
      .concat((content.schedule.length ? content.schedule : [
        { day: 'Monday', time: '09:00-10:30', subject: 'Mathematics', teacher: 'Prof. Smith', room: '101' }
      ]).map(function (row) {
        return [row.day, row.time, row.subject, row.teacher, row.room];
      }));
    var csv = rows.map(function (row) {
      return row.map(csvEscape).join(',');
    }).join('\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = 'schedule-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function readClassroomConfig() {
    try {
      return JSON.parse(localStorage.getItem(CLASSROOM_CONFIG_KEY) || '{}') || {};
    } catch (error) {
      localStorage.removeItem(CLASSROOM_CONFIG_KEY);
      return {};
    }
  }

  function writeClassroomConfig(config) {
    localStorage.setItem(CLASSROOM_CONFIG_KEY, JSON.stringify(config));
  }

  function parseCourseList(value) {
    return splitLines(value).map(function (line) {
      var parts = line.split('|');
      var id = '';
      var name = '';

      if (parts.length > 1) {
        name = (parts.shift() || '').trim();
        id = parts.join('|').trim();
      } else {
        id = line.trim();
        name = id;
      }

      return { name: name || id, id: id };
    }).filter(function (course) {
      return course.id;
    });
  }

  function formatCourseList(courses) {
    return (courses || []).map(function (course) {
      return course.name && course.name !== course.id ? course.name + ' | ' + course.id : course.id;
    }).join('\n');
  }

  function renderClassroomCourseSelect(courses, selectedId) {
    var select = document.getElementById('classroom-course-select');
    if (!select) return;

    select.replaceChildren();

    if (!courses.length) {
      var emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'Add classroom IDs above';
      select.appendChild(emptyOption);
      return;
    }

    courses.forEach(function (course) {
      var option = document.createElement('option');
      option.value = course.id;
      option.textContent = course.name && course.name !== course.id ? course.name + ' (' + course.id + ')' : course.id;
      option.selected = course.id === selectedId;
      select.appendChild(option);
    });

    if (!select.value) select.value = courses[0].id;
    select.onchange = function () {
      var config = readClassroomConfig();
      config.selectedCourseId = select.value;
      writeClassroomConfig(config);
    };
  }

  function hydrateClassroomSettings() {
    var config = readClassroomConfig();
    var urlInput = document.getElementById('classroom-bridge-url');
    var secretInput = document.getElementById('classroom-bridge-secret');
    var coursesInput = document.getElementById('classroom-course-list');
    var courses = Array.isArray(config.courses) ? config.courses : [];

    if (urlInput) urlInput.value = config.bridgeUrl || '';
    if (secretInput) secretInput.value = getSessionItem(CLASSROOM_SECRET_KEY);
    if (coursesInput) coursesInput.value = formatCourseList(courses);
    renderClassroomCourseSelect(courses, config.selectedCourseId);
    renderClassroomPreview();
  }

  function saveClassroomSettings(silent) {
    var urlInput = document.getElementById('classroom-bridge-url');
    var secretInput = document.getElementById('classroom-bridge-secret');
    var coursesInput = document.getElementById('classroom-course-list');
    var courseSelect = document.getElementById('classroom-course-select');
    var courses = parseCourseList(coursesInput ? coursesInput.value : '');
    var selectedCourseId = courseSelect && courseSelect.value ? courseSelect.value : '';

    if (!selectedCourseId && courses.length) selectedCourseId = courses[0].id;
    if (selectedCourseId && !courses.some(function (course) { return course.id === selectedCourseId; })) {
      selectedCourseId = courses.length ? courses[0].id : '';
    }

    var config = {
      bridgeUrl: urlInput ? urlInput.value.trim() : '',
      courses: courses,
      selectedCourseId: selectedCourseId
    };

    writeClassroomConfig(config);
    renderClassroomCourseSelect(courses, selectedCourseId);

    if (secretInput) setSessionItem(CLASSROOM_SECRET_KEY, secretInput.value.trim());
    if (!silent) setStatus('classroom', 'Classroom settings saved in this browser.', 'success');

    return config;
  }

  function getCsvField(row, indexes, field) {
    var index = indexes[field];
    return typeof index === 'number' ? row[index] || '' : '';
  }

  function normalizeDateTimeForBridge(value) {
    if (!value) return '';

    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString();
  }

  function normalizeWorkType(value) {
    var normalized = String(value || 'ASSIGNMENT').trim().toUpperCase();
    var aliases = {
      TASK: 'ASSIGNMENT',
      QUESTION: 'SHORT_ANSWER_QUESTION',
      SHORTANSWER: 'SHORT_ANSWER_QUESTION',
      MULTIPLECHOICE: 'MULTIPLE_CHOICE_QUESTION',
      MCQ: 'MULTIPLE_CHOICE_QUESTION'
    };

    normalized = aliases[normalized.replace(/[^A-Z]/g, '')] || normalized;
    return ['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION'].indexOf(normalized) >= 0
      ? normalized
      : 'ASSIGNMENT';
  }

  function normalizeCourseworkState(value, scheduledAt) {
    var normalized = String(value || '').trim().toUpperCase();
    if (scheduledAt) return 'PUBLISHED';
    if (['DRAFT', 'PUBLISHED'].indexOf(normalized) >= 0) return normalized;
    return 'DRAFT';
  }

  function rowsToClassroomTasks(rows) {
    if (!rows.length) return [];

    var fields = ['title', 'description', 'topic', 'topicId', 'scheduledAt', 'dueAt', 'maxPoints', 'materialUrl', 'workType', 'state', 'choices'];
    var headers = rows[0].map(normalizeCsvHeader);
    var headerMap = {
      title: 'title',
      name: 'title',
      task: 'title',
      description: 'description',
      content: 'description',
      body: 'description',
      topic: 'topic',
      topicname: 'topic',
      topicid: 'topicId',
      scheduledat: 'scheduledAt',
      scheduledtime: 'scheduledAt',
      scheduleat: 'scheduledAt',
      publishat: 'scheduledAt',
      dueat: 'dueAt',
      due: 'dueAt',
      duedate: 'dueAt',
      deadline: 'dueAt',
      maxpoints: 'maxPoints',
      points: 'maxPoints',
      materialurl: 'materialUrl',
      materialurls: 'materialUrl',
      link: 'materialUrl',
      url: 'materialUrl',
      worktype: 'workType',
      type: 'workType',
      state: 'state',
      choices: 'choices',
      options: 'choices'
    };
    var indexes = {};
    var hasHeader = false;

    headers.forEach(function (header, index) {
      if (headerMap[header]) {
        indexes[headerMap[header]] = index;
        hasHeader = true;
      }
    });

    if (!hasHeader) {
      fields.forEach(function (field, index) {
        indexes[field] = index;
      });
    }

    var dataRows = hasHeader ? rows.slice(1) : rows;
    return dataRows.map(function (row) {
      var scheduledAt = normalizeDateTimeForBridge(getCsvField(row, indexes, 'scheduledAt'));
      var dueAt = normalizeDateTimeForBridge(getCsvField(row, indexes, 'dueAt'));
      var state = normalizeCourseworkState(getCsvField(row, indexes, 'state'), scheduledAt);

      return {
        title: getCsvField(row, indexes, 'title'),
        description: getCsvField(row, indexes, 'description'),
        topicName: getCsvField(row, indexes, 'topic'),
        topicId: getCsvField(row, indexes, 'topicId'),
        scheduledAt: scheduledAt,
        dueAt: dueAt,
        maxPoints: getCsvField(row, indexes, 'maxPoints'),
        materialUrls: splitMultiValue(getCsvField(row, indexes, 'materialUrl')),
        workType: normalizeWorkType(getCsvField(row, indexes, 'workType')),
        state: state,
        choices: splitMultiValue(getCsvField(row, indexes, 'choices'))
      };
    }).filter(function (task) {
      return task.title || task.description || task.topicName || task.topicId || task.scheduledAt || task.dueAt;
    });
  }

  function renderClassroomPreview(results) {
    var body = document.getElementById('classroom-preview-body');
    if (!body) return;

    body.replaceChildren();

    if (!classroomTasks.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 6;
      emptyCell.textContent = 'No Classroom task CSV loaded.';
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }

    classroomTasks.forEach(function (task, index) {
      var tr = document.createElement('tr');
      var result = results && results[index] ? results[index] : null;
      var values = [
        task.title,
        task.topicId || task.topicName || '',
        task.scheduledAt || '',
        task.dueAt || '',
        task.maxPoints || '',
        result ? (result.ok ? 'Created: ' + result.id : 'Error: ' + result.error) : task.state
      ];

      values.forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value || '';
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
  }

  function loadClassroomTasksFromCsv() {
    return new Promise(function (resolve, reject) {
      var fileInput = document.getElementById('classroom-csv');
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;

      if (!file) {
        reject(new Error('Choose a Classroom task CSV file first.'));
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        try {
          classroomTasks = rowsToClassroomTasks(parseCsv(String(reader.result || '')));
          renderClassroomPreview();
          if (!classroomTasks.length) {
            reject(new Error('No Classroom task rows found in that CSV.'));
            return;
          }
          resolve(classroomTasks);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function () {
        reject(new Error('Could not read that CSV file.'));
      };
      reader.readAsText(file);
    });
  }

  async function previewClassroomCsv() {
    try {
      await loadClassroomTasksFromCsv();
      setStatus('classroom', 'Loaded ' + classroomTasks.length + ' Classroom task rows. Review before sending.', 'success');
    } catch (error) {
      setStatus('classroom', error.message, 'error');
    }
  }

  function downloadClassroomTemplate() {
    var rows = [
      ['title', 'description', 'topic', 'topicId', 'scheduledAt', 'dueAt', 'maxPoints', 'materialUrl', 'workType', 'state', 'choices'],
      [
        'Chapter 1 Reading',
        'Read pages 1-12 and submit notes.',
        'Unit 1',
        '',
        '2026-09-01T09:00:00+03:00',
        '2026-09-05T18:00:00+03:00',
        '10',
        'https://example.com/reading.pdf',
        'ASSIGNMENT',
        'PUBLISHED',
        ''
      ],
      [
        'Exit ticket',
        'Choose the best answer.',
        'Unit 1',
        '',
        '2026-09-02T09:00:00+03:00',
        '',
        '',
        '',
        'MULTIPLE_CHOICE_QUESTION',
        'PUBLISHED',
        'A;B;C;D'
      ]
    ];
    var csv = rows.map(function (row) {
      return row.map(csvEscape).join(',');
    }).join('\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = 'classroom-tasks-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function validateBridgeUrl(value) {
    var parsed;

    try {
      parsed = new URL(value);
    } catch (error) {
      throw new Error('Enter a valid Apps Script Web App URL.');
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
      throw new Error('Use the Apps Script Web App URL from script.google.com.');
    }

    return parsed.toString();
  }

  function ensureClassroomBridge(url) {
    return new Promise(function (resolve, reject) {
      if (classroomBridgeFrame && classroomBridgeReadyUrl === url && classroomBridgeFrame.contentWindow) {
        resolve(classroomBridgeFrame);
        return;
      }

      if (classroomBridgeFrame) classroomBridgeFrame.remove();
      classroomBridgeReadyUrl = '';

      classroomBridgeFrame = document.createElement('iframe');
      classroomBridgeFrame.src = url;
      classroomBridgeFrame.title = 'Google Classroom Apps Script Bridge';
      classroomBridgeFrame.style.position = 'absolute';
      classroomBridgeFrame.style.width = '1px';
      classroomBridgeFrame.style.height = '1px';
      classroomBridgeFrame.style.border = '0';
      classroomBridgeFrame.style.left = '-9999px';
      classroomBridgeFrame.style.top = '-9999px';

      var timeout = window.setTimeout(function () {
        window.removeEventListener('message', handleReady);
        reject(new Error('Apps Script bridge did not become ready. Open the Web App URL once to authorize it, then try again.'));
      }, 45000);

      function handleReady(event) {
        if (!classroomBridgeFrame || event.source !== classroomBridgeFrame.contentWindow) return;
        if (!event.data || event.data.type !== 'classroomBridgeReady') return;

        window.clearTimeout(timeout);
        window.removeEventListener('message', handleReady);
        classroomBridgeReadyUrl = url;
        resolve(classroomBridgeFrame);
      }

      window.addEventListener('message', handleReady);
      document.body.appendChild(classroomBridgeFrame);
    });
  }

  function postClassroomBridge(url, payload) {
    return ensureClassroomBridge(url).then(function (frame) {
      return new Promise(function (resolve, reject) {
        var requestId = 'dipcc-classroom-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        var timeout = window.setTimeout(function () {
          window.removeEventListener('message', handleResponse);
          reject(new Error('Timed out waiting for Classroom bridge response. Check Apps Script executions before retrying to avoid duplicate posts.'));
        }, CLASSROOM_BRIDGE_TIMEOUT_MS);

        function handleResponse(event) {
          if (event.source !== frame.contentWindow) return;
          if (!event.data || event.data.type !== 'classroomBridgeResult' || event.data.requestId !== requestId) return;

          window.clearTimeout(timeout);
          window.removeEventListener('message', handleResponse);

          if (event.data.ok === false) {
            reject(new Error(event.data.error || 'Classroom bridge failed.'));
            return;
          }

          resolve(event.data.result);
        }

        window.addEventListener('message', handleResponse);
        frame.contentWindow.postMessage({
          type: 'classroomBridgeRequest',
          requestId: requestId,
          payload: payload
        }, '*');
      });
    });
  }

  async function sendClassroomTasks() {
    var config = saveClassroomSettings(true);
    var courseSelect = document.getElementById('classroom-course-select');
    var secretInput = document.getElementById('classroom-bridge-secret');
    var courseId = courseSelect ? courseSelect.value : config.selectedCourseId;
    var secret = (secretInput ? secretInput.value.trim() : '') || getSessionItem(CLASSROOM_SECRET_KEY);
    var bridgeUrl;

    try {
      bridgeUrl = validateBridgeUrl(config.bridgeUrl);
      if (!courseId) throw new Error('Select a Classroom course ID first.');
      await loadClassroomTasksFromCsv();
    } catch (error) {
      setStatus('classroom', error.message, 'error');
      return;
    }

    setSessionItem(CLASSROOM_SECRET_KEY, secret);
    setStatus('classroom', 'Sending ' + classroomTasks.length + ' tasks to Classroom. Do not retry until this finishes.', 'success');

    try {
      var result = await postClassroomBridge(bridgeUrl, {
        action: 'createCourseworkBatch',
        courseId: courseId,
        secret: secret,
        rows: classroomTasks
      });
      var rows = result && Array.isArray(result.results) ? result.results : [];
      var errors = rows.filter(function (row) { return !row.ok; }).slice(0, 3).map(function (row) {
        return 'row ' + row.row + ': ' + row.error;
      });

      renderClassroomPreview(rows);
      setStatus(
        'classroom',
        'Classroom sync finished. Created ' + (result.created || 0) + ' of ' + (result.total || classroomTasks.length) + ' tasks.' + (errors.length ? ' Errors: ' + errors.join('; ') : ''),
        errors.length ? 'error' : 'success'
      );
    } catch (error) {
      setStatus('classroom', 'Classroom bridge error: ' + error.message, 'error');
    }
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
    var tokenInput = document.getElementById('gh-token');
    var rememberInput = document.getElementById('remember-gh-token');
    var token = (tokenInput ? tokenInput.value.trim() : '') || getSessionItem(TOKEN_KEY);
    var message = document.getElementById('commit-msg').value.trim() || 'Admin: Update content via dashboard';

    if (!token) {
      setStatus('publish', 'Please enter your GitHub token.', 'error');
      return;
    }

    setSessionItem(TOKEN_KEY, rememberInput && rememberInput.checked ? token : '');
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

  function hydratePublishForm() {
    var tokenInput = document.getElementById('gh-token');
    var rememberInput = document.getElementById('remember-gh-token');
    var savedToken = getSessionItem(TOKEN_KEY);

    if (tokenInput && savedToken) tokenInput.value = savedToken;
    if (rememberInput) rememberInput.checked = Boolean(savedToken) || rememberInput.checked;
  }

  window.showSection = showSection;
  window.addScheduleRow = addScheduleRow;
  window.importScheduleCsv = importScheduleCsv;
  window.downloadScheduleTemplate = downloadScheduleTemplate;
  window.saveClassroomSettings = saveClassroomSettings;
  window.previewClassroomCsv = previewClassroomCsv;
  window.downloadClassroomTemplate = downloadClassroomTemplate;
  window.sendClassroomTasks = sendClassroomTasks;
  window.addLesson = addLesson;
  window.addDateRow = addDateRow;
  window.addContact = addContact;
  window.saveSection = saveSection;
  window.publishChanges = publishChanges;
  window.logout = logout;

  renderAll();
  hydratePublishForm();
  hydrateClassroomSettings();
})();
