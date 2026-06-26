// ===== SCHEDULE TABS =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const day = tab.dataset.day;
    document.querySelectorAll('#scheduleTable tbody tr').forEach(row => {
      row.style.display = (day === 'all' || row.dataset.day === day) ? '' : 'none';
    });
  });
});

// ===== LESSON ACCORDION =====
function toggleLesson(header) {
  const card = header.closest('.lesson-card');
  const body = card.querySelector('.lesson-card__body');
  const icon = header.querySelector('.lesson-card__icon');
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  icon.textContent = isOpen ? '➕' : '➖';
}

// ===== SEARCH =====
const searchData = [
  // Schedule items
  { section: 'Schedule', title: 'Mathematics (Mon & Thu)', detail: '09:00–10:30 | Prof. Smith | Room 101' },
  { section: 'Schedule', title: 'English Literature (Mon & Fri)', detail: '11:00–12:30 | Prof. Johnson | Room 204' },
  { section: 'Schedule', title: 'Physics (Tue)', detail: '09:00–10:30 | Prof. Lee | Lab 1' },
  { section: 'Schedule', title: 'History (Tue)', detail: '11:00–12:30 | Prof. Garcia | Room 305' },
  { section: 'Schedule', title: 'Computer Science (Wed)', detail: '09:00–10:30 | Prof. Patel | Lab 2' },
  { section: 'Schedule', title: 'Chemistry (Wed)', detail: '11:00–12:30 | Prof. Brown | Lab 3' },
  { section: 'Schedule', title: 'Physical Education (Thu)', detail: '11:00–12:30 | Coach Miller | Gym' },
  // Lessons
  { section: 'Lessons', title: 'Mathematics: Algebra, Trigonometry, Calculus', detail: 'Linear & Quadratic Equations, Derivatives' },
  { section: 'Lessons', title: 'English Literature: Stories, Poetry, Essays', detail: 'Romantics, Essay Writing, Novel Study' },
  { section: 'Lessons', title: 'Physics: Mechanics, Kinematics, Energy', detail: "Newton's Laws, Work, Circuits" },
  { section: 'Lessons', title: 'Computer Science: Programming, Algorithms', detail: 'Variables, Data Structures, Problem Solving' },
  { section: 'Lessons', title: 'History: Ancient to Modern', detail: 'Civilizations, Middle Ages, Renaissance, Modern' },
  { section: 'Lessons', title: 'Chemistry: Atoms, Bonds, Reactions', detail: 'Periodic Table, pH, Acids & Bases' },
  // Dates
  { section: 'Important Dates', title: 'First Day of Classes', detail: 'September 1' },
  { section: 'Important Dates', title: 'Midterm Exams', detail: 'October 15–20' },
  { section: 'Important Dates', title: 'Project Submission', detail: 'November 1' },
  { section: 'Important Dates', title: 'End of Semester 1', detail: 'December 20' },
  { section: 'Important Dates', title: 'Start of Semester 2', detail: 'January 15' },
  { section: 'Important Dates', title: 'Final Exams', detail: 'March 10–20' },
  { section: 'Important Dates', title: 'Graduation Ceremony', detail: 'June 15' },
  // Contacts
  { section: 'Contacts', title: 'Email', detail: 'dipccclassroom@example.com' },
  { section: 'Contacts', title: 'Office Hours', detail: 'Monday–Friday 08:00–17:00' },
  { section: 'Contacts', title: 'Library Hours', detail: 'Mon–Sat 08:00–20:00' },
];

function doSearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!query) return;
  const results = searchData.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.detail.toLowerCase().includes(query) ||
    item.section.toLowerCase().includes(query)
  );
  const resultsEl = document.getElementById('searchResults');
  if (results.length === 0) {
    resultsEl.innerHTML = '<p class="no-results">No results found for "' + query + '".</p>';
  } else {
    resultsEl.innerHTML = results.map(r =>
      '<div class="search-result-item"><strong>[' + r.section + '] ' + r.title + '</strong>' + r.detail + '</div>'
    ).join('');
  }
  document.getElementById('searchModal').classList.add('open');
}

function closeSearch() {
  document.getElementById('searchModal').classList.remove('open');
}

// Search on Enter key
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

// Close modal on backdrop click
document.getElementById('searchModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeSearch();
});

// ===== BURGER MENU =====
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  nav.classList.toggle('open');
});

// Close mobile nav when clicking a link
nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});

// ===== BACK TO TOP =====
const backToTopBtn = document.createElement('button');
backToTopBtn.id = 'backToTop';
backToTopBtn.title = 'Back to top';
backToTopBtn.textContent = '↑';
document.body.appendChild(backToTopBtn);

window.addEventListener('scroll', () => {
  backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  // Highlight active nav link
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 80) current = section.id;
  });
  document.querySelectorAll('.nav__link').forEach(link => {
    link.style.color = link.getAttribute('href') === '#' + current ? '#2563eb' : '';
    link.style.background = link.getAttribute('href') === '#' + current ? '#f0f7ff' : '';
  });
});

backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===== ANIMATE ON SCROLL =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.date-card, .contact-card, .lesson-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  observer.observe(card);
});
