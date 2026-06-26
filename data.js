(function (window) {
  'use strict';

  var data = {
    schedule: [
      { day: 'Monday', time: '09:00-10:30', subject: 'Mathematics', teacher: 'Prof. Smith', room: '101' },
      { day: 'Monday', time: '11:00-12:30', subject: 'English Literature', teacher: 'Prof. Johnson', room: '204' },
      { day: 'Tuesday', time: '09:00-10:30', subject: 'Physics', teacher: 'Prof. Lee', room: 'Lab 1' },
      { day: 'Tuesday', time: '11:00-12:30', subject: 'History', teacher: 'Prof. Garcia', room: '305' },
      { day: 'Wednesday', time: '09:00-10:30', subject: 'Computer Science', teacher: 'Prof. Patel', room: 'Lab 2' },
      { day: 'Wednesday', time: '11:00-12:30', subject: 'Chemistry', teacher: 'Prof. Brown', room: 'Lab 3' },
      { day: 'Thursday', time: '09:00-10:30', subject: 'Mathematics', teacher: 'Prof. Smith', room: '101' },
      { day: 'Thursday', time: '11:00-12:30', subject: 'Physical Education', teacher: 'Coach Miller', room: 'Gym' },
      { day: 'Friday', time: '09:00-10:30', subject: 'English Literature', teacher: 'Prof. Johnson', room: '204' },
      { day: 'Friday', time: '11:00-12:30', subject: 'Free Study', teacher: '-', room: 'Library' }
    ],
    lessons: [
      {
        subject: 'Mathematics',
        topics: [
          'Week 1: Algebra - Linear Equations',
          'Week 2: Quadratic Equations',
          'Week 3: Trigonometry',
          'Week 4: Calculus'
        ]
      },
      {
        subject: 'English Literature',
        topics: [
          'Week 1: Short Story Analysis',
          'Week 2: Poetry',
          'Week 3: Essay Writing',
          'Week 4: Novel Study'
        ]
      },
      {
        subject: 'Physics',
        topics: [
          'Week 1: Newton Laws',
          'Week 2: Kinematics',
          'Week 3: Energy and Work',
          'Week 4: Electricity'
        ]
      },
      {
        subject: 'Computer Science',
        topics: [
          'Week 1: Programming Intro',
          'Week 2: Variables and Functions',
          'Week 3: Data Structures',
          'Week 4: Algorithms'
        ]
      },
      {
        subject: 'History',
        topics: [
          'Week 1: Ancient Civilizations',
          'Week 2: Middle Ages',
          'Week 3: Renaissance',
          'Week 4: Modern History'
        ]
      },
      {
        subject: 'Chemistry',
        topics: [
          'Week 1: Periodic Table',
          'Week 2: Chemical Bonds',
          'Week 3: Reactions',
          'Week 4: Acids and Bases'
        ]
      }
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
      {
        title: 'Useful Links',
        icon: '\uD83C\uDF10',
        details: [],
        links: [
          { label: 'College Website', url: '#' },
          { label: 'Student Portal', url: '#' },
          { label: 'Course Catalog', url: '#' }
        ]
      }
    ]
  };

  window.DIPCC_DEFAULT_DATA = data;
  window.DIPCC_DATA = data;
})(window);
