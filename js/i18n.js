// UI translations and language persistence for the public site.
(function (window) {
  'use strict';

  var LANGUAGE_KEY = 'dipcc_language';
  var DEFAULT_LANGUAGE = 'uk';

  var MESSAGES = {
    uk: {
      'page.title': 'DIPCC Classroom — Інформація для студентів',
      'language.label': 'Вибір мови',
      'menu.toggle': 'Відкрити меню',
      'nav.schedule': 'Розклад',
      'nav.lessons': 'Заняття',
      'nav.dates': 'Важливі дати',
      'nav.contacts': 'Контакти',
      'nav.qr': 'QR-код',
      'hero.title': 'Інформаційний хаб коледжу',
      'hero.subtitle': 'Усе необхідне: розклад, заняття, важливі дати та контакти.',
      'search.placeholder': 'Пошук предметів, викладачів, тем...',
      'search.button': 'Пошук',
      'search.results': 'Результати пошуку',
      'search.noResults': 'За запитом «{query}» нічого не знайдено.',
      'search.sections.schedule': 'Розклад',
      'search.sections.lessons': 'Заняття',
      'search.sections.dates': 'Важливі дати',
      'search.sections.contacts': 'Контакти',
      'schedule.title': 'Щотижневий розклад',
      'schedule.allDays': 'Усі дні',
      'schedule.day': 'День',
      'schedule.time': 'Час',
      'schedule.subject': 'Предмет',
      'schedule.teacher': 'Викладач',
      'schedule.room': 'Аудиторія',
      'days.monday': 'Понеділок',
      'days.tuesday': 'Вівторок',
      'days.wednesday': 'Середа',
      'days.thursday': 'Четвер',
      'days.friday': 'П’ятниця',
      'lessons.title': 'Заняття та теми',
      'lessons.untitled': 'Без назви',
      'dates.title': 'Важливі дати',
      'contacts.title': 'Контакти й ресурси',
      'contacts.defaultTitle': 'Контакт',
      'qr.title': 'Швидкий доступ за QR-кодом',
      'qr.description': 'Відскануйте код камерою телефона або натисніть на нього, щоб відкрити посилання.',
      'qr.open': 'Відкрити посилання',
      'qr.clickHint': 'Натисніть, щоб перейти',
      'qr.imageAlt': 'QR-код для швидкого доступу',
      'qr.linkLabel': 'Відкрити посилання QR-коду в новій вкладці',
      'footer.copyright': '2026 DIPCC Classroom. Усі права захищено.',
      'footer.updated': 'Оновлено: червень 2026',
      'modal.close': 'Закрити',
      'backToTop': 'На початок'
    },
    en: {
      'page.title': 'DIPCC Classroom — Student Information',
      'language.label': 'Language selector',
      'menu.toggle': 'Toggle menu',
      'nav.schedule': 'Schedule',
      'nav.lessons': 'Lessons',
      'nav.dates': 'Important Dates',
      'nav.contacts': 'Contacts',
      'nav.qr': 'QR Code',
      'hero.title': 'College Information Hub',
      'hero.subtitle': 'Your one-stop resource for schedules, lessons, important dates, and contacts.',
      'search.placeholder': 'Search subjects, teachers, topics...',
      'search.button': 'Search',
      'search.results': 'Search Results',
      'search.noResults': 'No results found for “{query}”.',
      'search.sections.schedule': 'Schedule',
      'search.sections.lessons': 'Lessons',
      'search.sections.dates': 'Important Dates',
      'search.sections.contacts': 'Contacts',
      'schedule.title': 'Weekly Schedule',
      'schedule.allDays': 'All Days',
      'schedule.day': 'Day',
      'schedule.time': 'Time',
      'schedule.subject': 'Subject',
      'schedule.teacher': 'Teacher',
      'schedule.room': 'Room',
      'days.monday': 'Monday',
      'days.tuesday': 'Tuesday',
      'days.wednesday': 'Wednesday',
      'days.thursday': 'Thursday',
      'days.friday': 'Friday',
      'lessons.title': 'Lessons and Topics',
      'lessons.untitled': 'Untitled lesson',
      'dates.title': 'Important Dates',
      'contacts.title': 'Contacts and Resources',
      'contacts.defaultTitle': 'Contact',
      'qr.title': 'Quick access with a QR code',
      'qr.description': 'Scan the code with your phone camera or click it to open the link.',
      'qr.open': 'Open link',
      'qr.clickHint': 'Click to open',
      'qr.imageAlt': 'QR code for quick access',
      'qr.linkLabel': 'Open the QR code link in a new tab',
      'footer.copyright': '2026 DIPCC Classroom. All rights reserved.',
      'footer.updated': 'Last updated: June 2026',
      'modal.close': 'Close',
      'backToTop': 'Back to top'
    }
  };

  function isSupported(language) {
    return Boolean(MESSAGES[language]);
  }

  function readSavedLanguage() {
    try {
      var language = localStorage.getItem(LANGUAGE_KEY);
      return isSupported(language) ? language : DEFAULT_LANGUAGE;
    } catch (error) {
      return DEFAULT_LANGUAGE;
    }
  }

  function saveLanguage(language) {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      // The page remains usable if browser storage is unavailable.
    }
  }

  function text(language, key) {
    return (MESSAGES[language] && MESSAGES[language][key]) || MESSAGES[DEFAULT_LANGUAGE][key] || key;
  }

  window.DIPCC_I18N = {
    DEFAULT_LANGUAGE: DEFAULT_LANGUAGE,
    isSupported: isSupported,
    readSavedLanguage: readSavedLanguage,
    saveLanguage: saveLanguage,
    text: text
  };
})(window);
