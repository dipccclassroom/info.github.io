(function (window) {
  'use strict';

  var localizedData = {
    en: {
      schedule: [
        { dayKey: 'monday', day: 'Monday', time: '09:00-10:30', subject: 'Mathematics', teacher: 'Prof. Smith', room: 'Google Meet Link' },
        { dayKey: 'monday', day: 'Monday', time: '11:00-12:30', subject: 'English Literature', teacher: 'Prof. Johnson', room: '204' },
        { dayKey: 'tuesday', day: 'Tuesday', time: '09:00-10:30', subject: 'Physics', teacher: 'Prof. Lee', room: 'Lab 1' },
        { dayKey: 'tuesday', day: 'Tuesday', time: '11:00-12:30', subject: 'History', teacher: 'Prof. Garcia', room: '305' },
        { dayKey: 'wednesday', day: 'Wednesday', time: '09:00-10:30', subject: 'Computer Science', teacher: 'Prof. Patel', room: 'Lab 2' },
        { dayKey: 'wednesday', day: 'Wednesday', time: '11:00-12:30', subject: 'Chemistry', teacher: 'Prof. Brown', room: 'Lab 3' },
        { dayKey: 'thursday', day: 'Thursday', time: '09:00-10:30', subject: 'Mathematics', teacher: 'Prof. Smith', room: '101' },
        { dayKey: 'thursday', day: 'Thursday', time: '11:00-12:30', subject: 'Physical Education', teacher: 'Coach Miller', room: 'Gym' },
        { dayKey: 'friday', day: 'Friday', time: '09:00-10:30', subject: 'English Literature', teacher: 'Prof. Johnson', room: '204' },
        { dayKey: 'friday', day: 'Friday', time: '11:00-12:30', subject: 'Free Study', teacher: '-', room: 'Library' }
      ],
      lessons: [
        { subject: 'Mathematics', topics: ['Week 1: Algebra - Linear Equations', 'Week 2: Quadratic Equations', 'Week 3: Trigonometry', 'Week 4: Calculus'] },
        { subject: 'English Literature', topics: ['Week 1: Short Story Analysis', 'Week 2: Poetry', 'Week 3: Essay Writing', 'Week 4: Novel Study'] },
        { subject: 'Physics', topics: ['Week 1: Newton Laws', 'Week 2: Kinematics', 'Week 3: Energy and Work', 'Week 4: Electricity'] },
        { subject: 'Computer Science', topics: ['Week 1: Programming Intro', 'Week 2: Variables and Functions', 'Week 3: Data Structures', 'Week 4: Algorithms'] },
        { subject: 'History', topics: ['Week 1: Ancient Civilizations', 'Week 2: Middle Ages', 'Week 3: Renaissance', 'Week 4: Modern History'] },
        { subject: 'Chemistry', topics: ['Week 1: Periodic Table', 'Week 2: Chemical Bonds', 'Week 3: Reactions', 'Week 4: Acids and Bases'] }
      ],
      dates: [
        { date: 'Sep 1', event: 'First Day of Classes' },
        { date: 'Oct 15', event: 'Midterm Exams Begin' },
        { date: 'Oct 20', event: 'Midterm Exams End' },
        { date: 'Nov 1', event: 'Project Submission' },
        { date: 'Dec 20', event: 'Last Day Semester 1' },
        { date: 'Jan 15', event: 'Start Semester 2' },
        { date: 'Mar 10', event: 'Final Exams Begin' },
        { date: 'Mar 20', event: 'Final Exams End' },
        { date: 'Jun 15', event: 'Graduation Ceremony', highlight: true }
      ],
      contacts: [
        { title: 'Email', icon: '\u2709', details: ['dipccclassroom@example.com'], links: [] },
        { title: 'Office Hours', icon: '\u23F0', details: ['Mon-Fri 08:00-17:00'], links: [] },
        { title: 'Library', icon: '\uD83D\uDCD6', details: ['Mon-Sat 08:00-20:00'], links: [] },
        { title: 'Useful Links', icon: '\uD83C\uDF10', details: [], links: [{ label: 'College Website', url: '#' }, { label: 'Student Portal', url: '#' }, { label: 'Course Catalog', url: '#' }] }
      ],
      qrCode: { imageSrc: 'qr-code.svg', linkUrl: 'https://t.me/AccesSureBot' }
    },
    uk: {
      schedule: [
        { dayKey: 'monday', day: 'Понеділок', time: '09:00-10:30', subject: 'Математика', teacher: 'Проф. Сміт', room: 'Посилання Google Meet' },
        { dayKey: 'monday', day: 'Понеділок', time: '11:00-12:30', subject: 'Англійська література', teacher: 'Проф. Джонсон', room: '204' },
        { dayKey: 'tuesday', day: 'Вівторок', time: '09:00-10:30', subject: 'Фізика', teacher: 'Проф. Лі', room: 'Лаб. 1' },
        { dayKey: 'tuesday', day: 'Вівторок', time: '11:00-12:30', subject: 'Історія', teacher: 'Проф. Гарсія', room: '305' },
        { dayKey: 'wednesday', day: 'Середа', time: '09:00-10:30', subject: 'Інформатика', teacher: 'Проф. Патель', room: 'Лаб. 2' },
        { dayKey: 'wednesday', day: 'Середа', time: '11:00-12:30', subject: 'Хімія', teacher: 'Проф. Браун', room: 'Лаб. 3' },
        { dayKey: 'thursday', day: 'Четвер', time: '09:00-10:30', subject: 'Математика', teacher: 'Проф. Сміт', room: '101' },
        { dayKey: 'thursday', day: 'Четвер', time: '11:00-12:30', subject: 'Фізична культура', teacher: 'Тренер Міллер', room: 'Спортзал' },
        { dayKey: 'friday', day: 'П’ятниця', time: '09:00-10:30', subject: 'Англійська література', teacher: 'Проф. Джонсон', room: '204' },
        { dayKey: 'friday', day: 'П’ятниця', time: '11:00-12:30', subject: 'Самостійне навчання', teacher: '-', room: 'Бібліотека' }
      ],
      lessons: [
        { subject: 'Математика', topics: ['Тиждень 1: Алгебра — лінійні рівняння', 'Тиждень 2: Квадратні рівняння', 'Тиждень 3: Тригонометрія', 'Тиждень 4: Основи математичного аналізу'] },
        { subject: 'Англійська література', topics: ['Тиждень 1: Аналіз оповідання', 'Тиждень 2: Поезія', 'Тиждень 3: Написання есе', 'Тиждень 4: Вивчення роману'] },
        { subject: 'Фізика', topics: ['Тиждень 1: Закони Ньютона', 'Тиждень 2: Кінематика', 'Тиждень 3: Енергія та робота', 'Тиждень 4: Електрика'] },
        { subject: 'Інформатика', topics: ['Тиждень 1: Вступ до програмування', 'Тиждень 2: Змінні та функції', 'Тиждень 3: Структури даних', 'Тиждень 4: Алгоритми'] },
        { subject: 'Історія', topics: ['Тиждень 1: Стародавні цивілізації', 'Тиждень 2: Середньовіччя', 'Тиждень 3: Відродження', 'Тиждень 4: Сучасна історія'] },
        { subject: 'Хімія', topics: ['Тиждень 1: Періодична таблиця', 'Тиждень 2: Хімічні зв’язки', 'Тиждень 3: Хімічні реакції', 'Тиждень 4: Кислоти та основи'] }
      ],
      dates: [
        { date: '1 вер.', event: 'Перший день навчання' },
        { date: '15 жовт.', event: 'Початок проміжних іспитів' },
        { date: '20 жовт.', event: 'Завершення проміжних іспитів' },
        { date: '1 лист.', event: 'Кінцевий термін подання проєктів' },
        { date: '20 груд.', event: 'Останній день першого семестру' },
        { date: '15 січ.', event: 'Початок другого семестру' },
        { date: '10 бер.', event: 'Початок фінальних іспитів' },
        { date: '20 бер.', event: 'Завершення фінальних іспитів' },
        { date: '15 черв.', event: 'Випускна церемонія', highlight: true }
      ],
      contacts: [
        { title: 'Електронна пошта', icon: '\u2709', details: ['dipccclassroom@example.com'], links: [] },
        { title: 'Години роботи', icon: '\u23F0', details: ['Пн–Пт 08:00–17:00'], links: [] },
        { title: 'Бібліотека', icon: '\uD83D\uDCD6', details: ['Пн–Сб 08:00–20:00'], links: [] },
        { title: 'Корисні посилання', icon: '\uD83C\uDF10', details: [], links: [{ label: 'Сайт коледжу', url: '#' }, { label: 'Студентський портал', url: '#' }, { label: 'Каталог курсів', url: '#' }] }
      ],
      qrCode: { imageSrc: 'qr-code.svg', linkUrl: 'https://t.me/AccesSureBot' }
    }
  };

  window.DIPCC_LOCALIZED_DATA = localizedData;
  window.DIPCC_DEFAULT_DATA = localizedData.uk;
  window.DIPCC_DATA = localizedData.uk;
})(window);
