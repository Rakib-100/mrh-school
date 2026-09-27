export const users = [
  { id: 1, name: 'Md. Rahman', email: 'student@mrhschool.com', password: '123456', role: 'student' },
  { id: 2, name: 'Nusrat Jahan', email: 'teacher@mrhschool.com', password: '123456', role: 'teacher' },
  { id: 3, name: 'Admin User', email: 'admin@mrhschool.com', password: '123456', role: 'admin' },
]

export const examQuestions = [
  {
    id: 1,
    question: 'What is the capital of Bangladesh?',
    options: ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna'],
    correct: 'A',
    marks: 2,
  },
  {
    id: 2,
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correct: 'B',
    marks: 2,
  },
  {
    id: 3,
    question: 'The process of converting a sentence into passive voice changes the?',
    options: ['Verb', 'Noun', 'Adjective', 'Pronoun'],
    correct: 'A',
    marks: 2,
  },
  {
    id: 4,
    question: 'Which of the following is a prime number?',
    options: ['21', '27', '29', '33'],
    correct: 'C',
    marks: 2,
  },
  {
    id: 5,
    question: 'Which organ pumps blood throughout the human body?',
    options: ['Lungs', 'Brain', 'Heart', 'Kidney'],
    correct: 'C',
    marks: 2,
  },
]

export const upcomingExams = [
  { exam: 'Final Maths Quiz', subject: 'Mathematics', date: '27 Sep 2026', duration: '45 min', status: 'Ready' },
  { exam: 'Weekly Physics Test', subject: 'Physics', date: '29 Sep 2026', duration: '30 min', status: 'Scheduled' },
  { exam: 'English Grammar', subject: 'English', date: '01 Oct 2026', duration: '40 min', status: 'Ready' },
]

export const recentResults = [
  { exam: 'Math Quiz', score: '8/10', percentage: '80%', date: '22 Sep 2026' },
  { exam: 'Science MCQ', score: '7/10', percentage: '70%', date: '18 Sep 2026' },
  { exam: 'Reading Test', score: '9/10', percentage: '90%', date: '10 Sep 2026' },
]

export const courseCards = [
  { name: 'SSC Foundation', students: 42, teacher: 'Nusrat Jahan' },
  { name: 'HSC Science', students: 38, teacher: 'Mahmud Hasan' },
  { name: 'IELTS Advanced', students: 19, teacher: 'Rafi Karim' },
]

export const attendanceSummary = { present: 24, absent: 3, percentage: '88.89%' }
