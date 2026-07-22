// Google Classroom integration: settings, task CSV import/preview, and the
// Apps Script bridge (postMessage with a form-submit fallback).
(function () {
  'use strict';

  var admin = window.DIPCC_ADMIN;
  if (!admin) return;

  var utils = window.DIPCC_UTILS;
  var csv = admin.csv;
  var config = admin.config;
  var BRIDGE_TIMEOUT_MS = 120000;

  var classroomTasks = [];
  var bridgeFrame = null;
  var bridgeWindow = null;
  var bridgeOrigin = '';
  var bridgeReadyUrl = '';

  function splitMultiValue(value) {
    return String(value || '')
      .split(/[;\n]/)
      .map(function (entry) { return entry.trim(); })
      .filter(Boolean);
  }

  /* ----- Settings ----- */

  function readClassroomConfig() {
    try {
      return JSON.parse(localStorage.getItem(config.CLASSROOM_CONFIG_KEY) || '{}') || {};
    } catch (error) {
      localStorage.removeItem(config.CLASSROOM_CONFIG_KEY);
      return {};
    }
  }

  function writeClassroomConfig(value) {
    localStorage.setItem(config.CLASSROOM_CONFIG_KEY, JSON.stringify(value));
  }

  function parseCourseList(value) {
    return utils.splitLines(value).map(function (line) {
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

  function renderCourseSelect(courses, selectedId) {
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
      var stored = readClassroomConfig();
      stored.selectedCourseId = select.value;
      writeClassroomConfig(stored);
    };
  }

  function hydrateClassroomSettings() {
    var stored = readClassroomConfig();
    var urlInput = document.getElementById('classroom-bridge-url');
    var secretInput = document.getElementById('classroom-bridge-secret');
    var coursesInput = document.getElementById('classroom-course-list');
    var courses = Array.isArray(stored.courses) ? stored.courses : [];

    if (urlInput) urlInput.value = stored.bridgeUrl || '';
    if (secretInput) secretInput.value = admin.getSessionItem(config.CLASSROOM_SECRET_KEY);
    if (coursesInput) coursesInput.value = formatCourseList(courses);
    renderCourseSelect(courses, stored.selectedCourseId);
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

    var stored = {
      bridgeUrl: urlInput ? urlInput.value.trim() : '',
      courses: courses,
      selectedCourseId: selectedCourseId
    };

    writeClassroomConfig(stored);
    renderCourseSelect(courses, selectedCourseId);

    if (secretInput) admin.setSessionItem(config.CLASSROOM_SECRET_KEY, secretInput.value.trim());
    if (!silent) admin.setStatus('classroom', 'Classroom settings saved in this browser.', 'success');

    return stored;
  }

  /* ----- Task CSV ----- */

  var TASK_FIELDS = ['title', 'description', 'topic', 'topicId', 'scheduledAt', 'dueAt', 'maxPoints', 'materialUrl', 'workType', 'state', 'choices'];
  var TASK_HEADER_MAP = {
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
    if (scheduledAt) return 'DRAFT';
    if (['DRAFT', 'PUBLISHED'].indexOf(normalized) >= 0) return normalized;
    return 'DRAFT';
  }

  function getPreviewState(task) {
    if (task.scheduledAt) return 'SCHEDULED';
    return task.state || 'DRAFT';
  }

  function rowsToClassroomTasks(rows) {
    if (!rows.length) return [];

    var mapped = csv.mapColumns(rows, TASK_FIELDS, TASK_HEADER_MAP);
    return mapped.dataRows.map(function (row) {
      var scheduledAt = normalizeDateTimeForBridge(csv.getField(row, mapped.indexes, 'scheduledAt'));
      var dueAt = normalizeDateTimeForBridge(csv.getField(row, mapped.indexes, 'dueAt'));
      var state = normalizeCourseworkState(csv.getField(row, mapped.indexes, 'state'), scheduledAt);

      return {
        title: csv.getField(row, mapped.indexes, 'title'),
        description: csv.getField(row, mapped.indexes, 'description'),
        topicName: csv.getField(row, mapped.indexes, 'topic'),
        topicId: csv.getField(row, mapped.indexes, 'topicId'),
        scheduledAt: scheduledAt,
        dueAt: dueAt,
        maxPoints: csv.getField(row, mapped.indexes, 'maxPoints'),
        materialUrls: splitMultiValue(csv.getField(row, mapped.indexes, 'materialUrl')),
        workType: normalizeWorkType(csv.getField(row, mapped.indexes, 'workType')),
        state: state,
        choices: splitMultiValue(csv.getField(row, mapped.indexes, 'choices'))
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
        result ? (result.ok ? 'Created: ' + result.id : 'Error: ' + result.error) : getPreviewState(task)
      ];

      values.forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value || '';
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
  }

  async function loadClassroomTasksFromCsv() {
    var rows;
    try {
      rows = await csv.readFile(document.getElementById('classroom-csv'));
    } catch (error) {
      throw new Error(error.message === 'Choose a CSV file first.'
        ? 'Choose a Classroom task CSV file first.'
        : error.message);
    }

    classroomTasks = rowsToClassroomTasks(rows);
    renderClassroomPreview();
    if (!classroomTasks.length) {
      throw new Error('No Classroom task rows found in that CSV.');
    }
    return classroomTasks;
  }

  async function previewClassroomCsv() {
    try {
      await loadClassroomTasksFromCsv();
      admin.setStatus('classroom', 'Loaded ' + classroomTasks.length + ' Classroom task rows. Review before sending.', 'success');
    } catch (error) {
      admin.setStatus('classroom', error.message, 'error');
    }
  }

  function downloadClassroomTemplate() {
    csv.download('classroom-tasks-template.csv', [
      TASK_FIELDS,
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
        'DRAFT',
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
        'DRAFT',
        'A;B;C;D'
      ]
    ]);
  }

  /* ----- Apps Script bridge ----- */

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

  function isAllowedBridgeOrigin(origin) {
    var parsed;

    if (origin === 'null') return true;

    try {
      parsed = new URL(origin);
    } catch (error) {
      return false;
    }

    return parsed.protocol === 'https:' && (
      parsed.hostname === 'script.google.com' ||
      parsed.hostname === 'script.googleusercontent.com' ||
      parsed.hostname.endsWith('.googleusercontent.com')
    );
  }

  function getBridgeTargetOrigin(origin) {
    return origin && origin !== 'null' ? origin : '*';
  }

  function ensureBridge(url) {
    return new Promise(function (resolve, reject) {
      if (bridgeWindow && bridgeReadyUrl === url) {
        resolve({ source: bridgeWindow, origin: bridgeOrigin });
        return;
      }

      if (bridgeFrame) bridgeFrame.remove();
      bridgeWindow = null;
      bridgeOrigin = '';
      bridgeReadyUrl = '';

      bridgeFrame = document.createElement('iframe');
      bridgeFrame.src = url;
      bridgeFrame.title = 'Google Classroom Apps Script Bridge';
      bridgeFrame.style.position = 'absolute';
      bridgeFrame.style.width = '1px';
      bridgeFrame.style.height = '1px';
      bridgeFrame.style.border = '0';
      bridgeFrame.style.left = '-9999px';
      bridgeFrame.style.top = '-9999px';

      var timeout = window.setTimeout(function () {
        var error = new Error('Apps Script bridge did not become ready.');
        error.code = 'BRIDGE_NOT_READY';
        window.removeEventListener('message', handleReady);
        reject(error);
      }, 45000);

      function handleReady(event) {
        if (!event.data || event.data.type !== 'classroomBridgeReady') return;
        if (!isAllowedBridgeOrigin(event.origin)) return;

        window.clearTimeout(timeout);
        window.removeEventListener('message', handleReady);
        bridgeWindow = event.source;
        bridgeOrigin = event.origin;
        bridgeReadyUrl = url;
        resolve({ source: bridgeWindow, origin: bridgeOrigin });
      }

      window.addEventListener('message', handleReady);
      document.body.appendChild(bridgeFrame);
    });
  }

  function postBridge(url, payload) {
    return ensureBridge(url).then(function (bridge) {
      return new Promise(function (resolve, reject) {
        var requestId = 'dipcc-classroom-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        var timeout = window.setTimeout(function () {
          window.removeEventListener('message', handleResponse);
          reject(new Error('Timed out waiting for Classroom bridge response. Check Apps Script executions before retrying to avoid duplicate posts.'));
        }, BRIDGE_TIMEOUT_MS);

        function handleResponse(event) {
          if (event.source !== bridge.source) return;
          if (!isAllowedBridgeOrigin(event.origin)) return;
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
        bridge.source.postMessage({
          type: 'classroomBridgeRequest',
          requestId: requestId,
          payload: payload
        }, getBridgeTargetOrigin(bridge.origin));
      });
    });
  }

  function submitBridgeForm(url, payload) {
    return new Promise(function (resolve, reject) {
      var frameName = 'dipcc-classroom-submit-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      var iframe = document.createElement('iframe');
      var form = document.createElement('form');
      var input = document.createElement('input');
      var submitted = false;
      var resolved = false;

      function cleanup() {
        form.remove();
        iframe.remove();
      }

      function finish() {
        if (resolved) return;
        resolved = true;
        resolve({
          submitted: true,
          total: classroomTasks.length
        });
        window.setTimeout(cleanup, 60000);
      }

      iframe.name = frameName;
      iframe.title = 'Google Classroom Apps Script Submission';
      iframe.style.position = 'absolute';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = '0';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.addEventListener('load', function () {
        if (submitted) finish();
      });

      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload);

      form.method = 'POST';
      form.action = url;
      form.target = frameName;
      form.acceptCharset = 'UTF-8';
      form.style.display = 'none';
      form.appendChild(input);

      document.body.append(iframe, form);

      try {
        submitted = true;
        form.submit();
        window.setTimeout(finish, 8000);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  async function sendClassroomTasks() {
    var stored = saveClassroomSettings(true);
    var courseSelect = document.getElementById('classroom-course-select');
    var secretInput = document.getElementById('classroom-bridge-secret');
    var courseId = courseSelect ? courseSelect.value : stored.selectedCourseId;
    var secret = (secretInput ? secretInput.value.trim() : '') || admin.getSessionItem(config.CLASSROOM_SECRET_KEY);
    var bridgeUrl;
    var payload;

    try {
      bridgeUrl = validateBridgeUrl(stored.bridgeUrl);
      if (!courseId) throw new Error('Select a Classroom course ID first.');
      await loadClassroomTasksFromCsv();
    } catch (error) {
      admin.setStatus('classroom', error.message, 'error');
      return;
    }

    admin.setSessionItem(config.CLASSROOM_SECRET_KEY, secret);
    admin.setStatus('classroom', 'Sending ' + classroomTasks.length + ' tasks to Classroom. Do not retry until this finishes.', 'success');

    try {
      payload = {
        action: 'createCourseworkBatch',
        courseId: courseId,
        secret: secret,
        dashboardOrigin: window.location.origin,
        rows: classroomTasks
      };
      var result = await postBridge(bridgeUrl, payload);
      var rows = result && Array.isArray(result.results) ? result.results : [];
      var errors = rows.filter(function (row) { return !row.ok; }).slice(0, 3).map(function (row) {
        return 'row ' + row.row + ': ' + row.error;
      });

      renderClassroomPreview(rows);
      admin.setStatus(
        'classroom',
        'Classroom sync finished. Created ' + (result.created || 0) + ' of ' + (result.total || classroomTasks.length) + ' tasks.' + (errors.length ? ' Errors: ' + errors.join('; ') : ''),
        errors.length ? 'error' : 'success'
      );
    } catch (error) {
      if (error.code === 'BRIDGE_NOT_READY') {
        try {
          admin.setStatus('classroom', 'Response bridge unavailable. Submitting via Apps Script form fallback...', 'success');
          await submitBridgeForm(bridgeUrl, payload);
          renderClassroomPreview();
          admin.setStatus('classroom', 'Submitted to Apps Script. Check Classroom and Apps Script Executions before retrying; this fallback cannot read row-level results.', 'success');
        } catch (fallbackError) {
          admin.setStatus('classroom', 'Classroom form fallback error: ' + fallbackError.message, 'error');
        }
        return;
      }
      admin.setStatus('classroom', 'Classroom bridge error: ' + error.message, 'error');
    }
  }

  admin.actions['save-classroom-settings'] = function () {
    saveClassroomSettings();
  };
  admin.actions['preview-classroom-csv'] = previewClassroomCsv;
  admin.actions['download-classroom-template'] = downloadClassroomTemplate;
  admin.actions['send-classroom-tasks'] = sendClassroomTasks;

  hydrateClassroomSettings();
})();
