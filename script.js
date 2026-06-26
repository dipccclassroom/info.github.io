(function () {
  'use strict';

  var DRAFT_KEY = 'dipcc_admin_draft';

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function readAdminDraft() {
    try {
      if (sessionStorage.getItem('dipcc_role') !== 'admin') return null;
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function getSiteData() {
    return readAdminDraft() || clone(window.DIPCC_DATA || window.DIPCC_DEFAULT_DATA);
  }

  function textCell(value) {
    var td = document.createElement('td');
    td.textContent = value || '';
    return td;
  }

  function renderSchedule(schedule) {
    var tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) return;

    tbody.replaceChildren();
    (schedule || []).forEach(function (item) {
      var row = document.createElement('tr');
      row.dataset.day = item.day || '';
      row.append(
        textCell(item.day),
        textCell(item.time),
        textCell(item.subject),
        textCell(item.teacher),
        textCell(item.room)
      );
      tbody.appendChild(row);
    });
  }

  function renderLessons(lessons) {
    var grid = document.querySelector('.lessons-grid');
    if (!grid) return;

    grid.replaceChildren();
    (lessons || []).forEach(function (lesson) {
      var card = document.createElement('article');
      card.className = 'lesson-card';

      var header = document.createElement('button');
      header.className = 'lesson-card__header';
      header.type = 'button';
      header.setAttribute('aria-expanded', 'false');

      var icon = document.createElement('span');
      icon.className = 'lesson-card__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '+';

      var title = document.createElement('h3');
      title.textContent = lesson.subject || 'Untitled lesson';

      var body = document.createElement('ul');
      body.className = 'lesson-card__body';

      (lesson.topics || []).forEach(function (topic) {
        var item = document.createElement('li');
        item.textContent = topic;
        body.appendChild(item);
      });

      header.append(icon, title);
      header.addEventListener('click', function () {
        toggleLesson(header);
      });

      card.append(header, body);
      grid.appendChild(card);
    });
  }

  function renderDates(dates) {
    var grid = document.querySelector('.dates-grid');
    if (!grid) return;

    grid.replaceChildren();
    (dates || []).forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'date-card';
      if (item.highlight) card.classList.add('highlight');

      var date = document.createElement('div');
      date.className = 'date-card__date';
      date.textContent = item.date || '';

      var event = document.createElement('div');
      event.className = 'date-card__event';
      event.textContent = item.event || '';

      card.append(date, event);
      grid.appendChild(card);
    });
  }

  function renderContacts(contacts) {
    var grid = document.querySelector('.contacts-grid');
    if (!grid) return;

    grid.replaceChildren();
    (contacts || []).forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'contact-card';

      var icon = document.createElement('div');
      icon.className = 'contact-card__icon';
      icon.textContent = item.icon || '';

      var title = document.createElement('h3');
      title.textContent = item.title || 'Contact';

      var details = document.createElement('p');
      (item.details || []).forEach(function (line, index) {
        if (index > 0) details.appendChild(document.createElement('br'));
        details.appendChild(document.createTextNode(line));
      });

      (item.links || []).forEach(function (link, index) {
        if (index > 0 || (item.details || []).length > 0) details.appendChild(document.createElement('br'));
        var anchor = document.createElement('a');
        anchor.href = link.url || '#';
        anchor.textContent = link.label || link.url || 'Link';
        details.appendChild(anchor);
      });

      card.append(icon, title, details);
      grid.appendChild(card);
    });
  }

  function buildSearchData(data) {
    var items = [];

    (data.schedule || []).forEach(function (row) {
      items.push({
        section: 'Schedule',
        title: row.subject + ' (' + row.day + ')',
        detail: [row.time, row.teacher, row.room].filter(Boolean).join(' | ')
      });
    });

    (data.lessons || []).forEach(function (lesson) {
      items.push({
        section: 'Lessons',
        title: lesson.subject || 'Lesson',
        detail: (lesson.topics || []).join(', ')
      });
    });

    (data.dates || []).forEach(function (date) {
      items.push({
        section: 'Important Dates',
        title: date.event || 'Important date',
        detail: date.date || ''
      });
    });

    (data.contacts || []).forEach(function (contact) {
      var linkText = (contact.links || []).map(function (link) { return link.label; });
      items.push({
        section: 'Contacts',
        title: contact.title || 'Contact',
        detail: (contact.details || []).concat(linkText).join(', ')
      });
    });

    return items;
  }

  function renderSearchResults(query, results) {
    var resultsEl = document.getElementById('searchResults');
    if (!resultsEl) return;

    resultsEl.replaceChildren();
    if (results.length === 0) {
      var none = document.createElement('p');
      none.className = 'no-results';
      none.textContent = 'No results found for "' + query + '".';
      resultsEl.appendChild(none);
      return;
    }

    results.forEach(function (result) {
      var item = document.createElement('div');
      item.className = 'search-result-item';

      var title = document.createElement('strong');
      title.textContent = '[' + result.section + '] ' + result.title;

      var detail = document.createElement('span');
      detail.textContent = result.detail;

      item.append(title, detail);
      resultsEl.appendChild(item);
    });
  }

  function doSearch() {
    var input = document.getElementById('searchInput');
    if (!input) return;

    var query = input.value.trim().toLowerCase();
    if (!query) return;

    var results = buildSearchData(getSiteData()).filter(function (item) {
      return item.title.toLowerCase().includes(query) ||
        item.detail.toLowerCase().includes(query) ||
        item.section.toLowerCase().includes(query);
    });

    renderSearchResults(query, results);
    document.getElementById('searchModal').classList.add('open');
  }

  function closeSearch() {
    document.getElementById('searchModal').classList.remove('open');
  }

  function toggleLesson(header) {
    var card = header.closest('.lesson-card');
    var body = card.querySelector('.lesson-card__body');
    var icon = header.querySelector('.lesson-card__icon');
    var isOpen = body.classList.contains('open');

    body.classList.toggle('open', !isOpen);
    header.setAttribute('aria-expanded', String(!isOpen));
    icon.textContent = isOpen ? '+' : '-';
  }

  function setupScheduleTabs() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (item) {
          item.classList.remove('active');
        });
        tab.classList.add('active');

        var day = tab.dataset.day;
        document.querySelectorAll('#scheduleTable tbody tr').forEach(function (row) {
          row.style.display = (day === 'all' || row.dataset.day === day) ? '' : 'none';
        });
      });
    });
  }

  function setupSearch() {
    var input = document.getElementById('searchInput');
    var modal = document.getElementById('searchModal');
    var button = document.querySelector('.search__btn');
    var close = document.querySelector('.modal__close');

    if (button) button.addEventListener('click', doSearch);
    if (close) close.addEventListener('click', closeSearch);
    if (input) {
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') doSearch();
      });
    }
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === event.currentTarget) closeSearch();
      });
    }
  }

  function setupBurgerMenu() {
    var burger = document.getElementById('burger');
    var nav = document.getElementById('nav');
    if (!burger || !nav) return;

    burger.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function setupBackToTop() {
    var button = document.createElement('button');
    button.id = 'backToTop';
    button.title = 'Back to top';
    button.textContent = '^';
    document.body.appendChild(button);

    window.addEventListener('scroll', function () {
      button.classList.toggle('visible', window.scrollY > 400);

      var current = '';
      document.querySelectorAll('section[id]').forEach(function (section) {
        if (window.scrollY >= section.offsetTop - 80) current = section.id;
      });

      document.querySelectorAll('.nav__link').forEach(function (link) {
        var active = link.getAttribute('href') === '#' + current;
        link.classList.toggle('nav__link--active', active);
      });
    });

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function setupScrollAnimation() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.date-card, .contact-card, .lesson-card').forEach(function (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      observer.observe(card);
    });
  }

  function init() {
    var data = getSiteData();
    renderSchedule(data.schedule);
    renderLessons(data.lessons);
    renderDates(data.dates);
    renderContacts(data.contacts);

    setupScheduleTabs();
    setupSearch();
    setupBurgerMenu();
    setupBackToTop();
    setupScrollAnimation();
  }

  window.doSearch = doSearch;
  window.closeSearch = closeSearch;
  window.toggleLesson = toggleLesson;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
