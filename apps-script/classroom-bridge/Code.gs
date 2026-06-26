const BRIDGE_SECRET_PROPERTY = 'BRIDGE_SECRET';
const DASHBOARD_ORIGIN_PROPERTY = 'DASHBOARD_ORIGIN';
const MAX_BATCH_SIZE = 100;
const MAX_MATERIALS = 20;

function doGet() {
  return HtmlService.createHtmlOutput(getBridgeHtml_())
    .setTitle('DIPCC Classroom Bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    return jsonOutput_({ ok: true, result: handleBridgeRequest(payload) });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

function handleBridgeRequest(payload) {
  if (!payload) {
    throw new Error('handleBridgeRequest is called by the dashboard. Run testBridgeSetup from the Apps Script editor instead.');
  }

  const request = payload;
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);
  try {
    verifyOrigin_(request.origin || request.dashboardOrigin || '');
    verifySecret_(request.secret || '');

    if (request.action !== 'createCourseworkBatch') {
      throw new Error('Unsupported action: ' + request.action);
    }

    return createCourseworkBatch_(request.courseId, request.rows || []);
  } finally {
    lock.releaseLock();
  }
}

function testBridgeSetup() {
  const properties = PropertiesService.getScriptProperties();
  const result = {
    ok: true,
    bridgeSecretConfigured: Boolean(properties.getProperty(BRIDGE_SECRET_PROPERTY)),
    dashboardOrigin: properties.getProperty(DASHBOARD_ORIGIN_PROPERTY) || '',
    message: 'Setup function ran. Use the dashboard, not handleBridgeRequest, to create Classroom tasks.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function createCourseworkBatch_(courseId, rows) {
  if (!courseId) throw new Error('Missing courseId.');
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No task rows supplied.');
  if (rows.length > MAX_BATCH_SIZE) throw new Error('Batch limit is ' + MAX_BATCH_SIZE + ' rows.');

  const topicCache = loadTopics_(courseId);
  const results = rows.map(function (row, index) {
    try {
      const courseWork = buildCourseWork_(courseId, row || {}, topicCache);
      const created = Classroom.Courses.CourseWork.create(courseWork, courseId);

      return {
        row: index + 1,
        ok: true,
        id: created.id || '',
        title: created.title || courseWork.title,
        alternateLink: created.alternateLink || ''
      };
    } catch (error) {
      return {
        row: index + 1,
        ok: false,
        title: row && row.title ? String(row.title) : '',
        error: error.message
      };
    }
  });

  return {
    courseId: String(courseId),
    total: results.length,
    created: results.filter(function (result) { return result.ok; }).length,
    failed: results.filter(function (result) { return !result.ok; }).length,
    results: results
  };
}

function buildCourseWork_(courseId, row, topicCache) {
  const title = String(row.title || '').trim();
  if (!title) throw new Error('Missing title.');

  const scheduledAt = String(row.scheduledAt || '').trim();
  const dueAt = String(row.dueAt || '').trim();
  const workType = normalizeWorkType_(row.workType);
  const state = normalizeState_(row.state, scheduledAt);
  const courseWork = {
    title: title,
    workType: workType,
    state: state
  };

  if (row.description) courseWork.description = String(row.description);
  if (scheduledAt) courseWork.scheduledTime = parseFutureIso_(scheduledAt, 'scheduledAt');
  if (dueAt) {
    const dueParts = toClassroomDueParts_(dueAt);
    courseWork.dueDate = dueParts.dueDate;
    courseWork.dueTime = dueParts.dueTime;
  }

  const points = normalizePoints_(row.maxPoints);
  if (points !== null) courseWork.maxPoints = points;

  const materialUrls = normalizeList_(row.materialUrls || row.materialUrl).slice(0, MAX_MATERIALS);
  if (materialUrls.length) {
    courseWork.materials = materialUrls.map(function (url) {
      return { link: { url: normalizeUrl_(url) } };
    });
  }

  if (row.topicId) {
    courseWork.topicId = String(row.topicId).trim();
  } else if (row.topicName || row.topic) {
    courseWork.topicId = ensureTopic_(courseId, String(row.topicName || row.topic).trim(), topicCache);
  }

  if (workType === 'MULTIPLE_CHOICE_QUESTION') {
    const choices = normalizeList_(row.choices);
    if (choices.length < 2) throw new Error('Multiple choice questions need at least two choices.');
    courseWork.multipleChoiceQuestion = { choices: choices };
  }

  return courseWork;
}

function loadTopics_(courseId) {
  const cache = {};
  let pageToken = null;

  do {
    const response = Classroom.Courses.Topics.list(courseId, {
      pageSize: 100,
      pageToken: pageToken || undefined
    });
    const topics = response.topic || response.topics || [];

    topics.forEach(function (topic) {
      const name = String(topic.name || '').trim().toLowerCase();
      const id = topic.topicId || topic.id;
      if (name && id) cache[name] = id;
    });

    pageToken = response.nextPageToken || null;
  } while (pageToken);

  return cache;
}

function ensureTopic_(courseId, topicName, topicCache) {
  if (!topicName) return '';

  const key = topicName.toLowerCase();
  if (topicCache[key]) return topicCache[key];

  const created = Classroom.Courses.Topics.create({ name: topicName }, courseId);
  const id = created.topicId || created.id;
  if (!id) throw new Error('Topic was created without a topicId: ' + topicName);

  topicCache[key] = id;
  return id;
}

function normalizeWorkType_(value) {
  const normalized = String(value || 'ASSIGNMENT').trim().toUpperCase();
  const compact = normalized.replace(/[^A-Z]/g, '');
  const aliases = {
    TASK: 'ASSIGNMENT',
    ASSIGNMENT: 'ASSIGNMENT',
    QUESTION: 'SHORT_ANSWER_QUESTION',
    SHORTANSWER: 'SHORT_ANSWER_QUESTION',
    SHORTANSWERQUESTION: 'SHORT_ANSWER_QUESTION',
    MCQ: 'MULTIPLE_CHOICE_QUESTION',
    MULTIPLECHOICE: 'MULTIPLE_CHOICE_QUESTION',
    MULTIPLECHOICEQUESTION: 'MULTIPLE_CHOICE_QUESTION'
  };
  const workType = aliases[compact] || normalized;

  if (['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION'].indexOf(workType) === -1) {
    throw new Error('Unsupported workType: ' + value);
  }

  return workType;
}

function normalizeState_(value, scheduledAt) {
  const normalized = String(value || '').trim().toUpperCase();
  if (scheduledAt) return 'DRAFT';
  if (normalized === 'DRAFT' || normalized === 'PUBLISHED') return normalized;
  return 'DRAFT';
}

function normalizePoints_(value) {
  if (value === null || value === undefined || value === '') return null;

  const points = Number(value);
  if (!Number.isFinite(points) || points < 0) throw new Error('maxPoints must be a non-negative number.');
  return points;
}

function normalizeList_(value) {
  if (Array.isArray(value)) {
    return value.map(function (entry) { return String(entry || '').trim(); }).filter(Boolean);
  }

  return String(value || '')
    .split(/[;\n]/)
    .map(function (entry) { return entry.trim(); })
    .filter(Boolean);
}

function normalizeUrl_(value) {
  const url = String(value || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Material URL must start with http:// or https://: ' + url);
  return url;
}

function parseFutureIso_(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(fieldName + ' must be a valid date/time.');
  if (date.getTime() <= Date.now() + 60000) throw new Error(fieldName + ' must be at least one minute in the future.');
  return date.toISOString();
}

function toClassroomDueParts_(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('dueAt must be a valid date/time.');

  return {
    dueDate: {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate()
    },
    dueTime: {
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      seconds: date.getUTCSeconds(),
      nanos: date.getUTCMilliseconds() * 1000000
    }
  };
}

function verifySecret_(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty(BRIDGE_SECRET_PROPERTY);
  if (expected && String(secret || '') !== expected) throw new Error('Invalid bridge secret.');
}

function verifyOrigin_(origin) {
  const allowed = PropertiesService.getScriptProperties().getProperty(DASHBOARD_ORIGIN_PROPERTY);
  if (!allowed) return;

  const allowedOrigins = allowed.split(',')
    .map(function (entry) { return entry.trim(); })
    .filter(Boolean);

  if (allowedOrigins.indexOf(origin) === -1) {
    throw new Error('Dashboard origin is not allowed: ' + (origin || '(empty)') + '. Add only the origin, such as https://dipccclassroom.github.io, to DASHBOARD_ORIGIN.');
  }
}

function parsePayload_(e) {
  if (e && e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  if (!e || !e.postData || !e.postData.contents) throw new Error('Missing POST body.');
  return JSON.parse(e.postData.contents);
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getBridgeHtml_() {
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><title>DIPCC Classroom Bridge</title></head>',
    '<body>',
    '<script>',
    '(function () {',
    '  var readyMessage = { type: "classroomBridgeReady" };',
    '  function reply(target, message, origin) {',
    '    if (!target) return;',
    '    target.postMessage(message, origin && origin !== "null" ? origin : "*");',
    '  }',
    '  function announceReady() {',
    '    reply(window.parent, readyMessage, "*");',
    '    if (window.top && window.top !== window.parent) reply(window.top, readyMessage, "*");',
    '  }',
    '  window.addEventListener("message", function (event) {',
    '    var message = event.data || {};',
    '    if (message.type !== "classroomBridgeRequest") return;',
    '    var payload = message.payload || {};',
    '    payload.origin = event.origin || payload.dashboardOrigin || "";',
    '    google.script.run',
    '      .withSuccessHandler(function (result) {',
    '        reply(event.source, { type: "classroomBridgeResult", requestId: message.requestId, ok: true, result: result }, event.origin);',
    '      })',
    '      .withFailureHandler(function (error) {',
    '        reply(event.source, { type: "classroomBridgeResult", requestId: message.requestId, ok: false, error: error && error.message ? error.message : String(error) }, event.origin);',
    '      })',
    '      .handleBridgeRequest(payload);',
    '  });',
    '  announceReady();',
    '}());',
    '<\/script>',
    '</body></html>'
  ].join('');
}
