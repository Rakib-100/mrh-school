import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  courseCards,
  examQuestions,
  recentResults,
  upcomingExams,
  users as initialUsers,
} from './mockBackend.js'
import { supabase } from './supabaseClient.js'
import './App.css'

const publicLinks = [
  { key: 'home', label: 'Home' },
  { key: 'about', label: 'About' },
  { key: 'courses', label: 'Courses' },
  { key: 'contact', label: 'Contact' },
  { key: 'login', label: 'Login' },
  { key: 'register', label: 'Register' },
]

const studentNav = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'profile', label: 'My Profile' },
  { key: 'courses', label: 'My Courses' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'upcomingExams', label: 'Upcoming Exams' },
  { key: 'examInstructions', label: 'Exam Instructions' },
  { key: 'previousResults', label: 'Previous Results' },
]

const teacherNav = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'classes', label: 'My Classes' },
  { key: 'students', label: 'Students' },
  { key: 'attendance', label: 'Attendance Management' },
  { key: 'createExam', label: 'Create Exam' },
  { key: 'manageExams', label: 'Manage Exams' },
  { key: 'results', label: 'Results' },
]

const adminNav = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
  { key: 'courses', label: 'Courses/Batches' },
  { key: 'exams', label: 'Exams' },
  { key: 'questions', label: 'Questions' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'results', label: 'Results' },
  { key: 'settings', label: 'Settings' },
]

const examStats = {
  totalQuestions: 5,
  totalMarks: 10,
  durationMinutes: 45,
  startedAt: '2026-09-27 09:00',
}

function formatTime(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function getStatusText(answers, reviewMap, index) {
  if (reviewMap[index]) return 'review'
  if (answers[index]) return 'answered'
  return 'unanswered'
}

function calculateExamResult(answers) {
  let correct = 0
  let wrong = 0
  let unanswered = 0

  examQuestions.forEach((question, index) => {
    const selected = answers[index]
    if (!selected) unanswered += 1
    else if (selected === question.correct) correct += 1
    else wrong += 1
  })

  const totalMarks = examQuestions.reduce((sum, question) => sum + question.marks, 0)
  const obtainedMarks = examQuestions.reduce((sum, question, index) => {
    return answers[index] === question.correct ? sum + question.marks : sum
  }, 0)

  return {
    totalQuestions: examQuestions.length,
    correct,
    wrong,
    unanswered,
    totalMarks,
    obtained: obtainedMarks,
    percentage: Math.round((obtainedMarks / totalMarks) * 100),
  }
}

function App() {
  const [view, setView] = useState('home')
  const [role, setRole] = useState('student')
  const [allUsers, setAllUsers] = useState(() => {
    try {
      const storedUsers = window.localStorage.getItem('mrh-school-users')
      return storedUsers ? JSON.parse(storedUsers) : initialUsers
    } catch {
      return initialUsers
    }
  })
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', studentId: '' })
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [examPhase, setExamPhase] = useState('instructions')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [reviewMap, setReviewMap] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(examStats.durationMinutes * 60)
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [savedExams, setSavedExams] = useState(() => {
    try {
      const storedExams = window.localStorage.getItem('mrh-school-exams')
      return storedExams ? JSON.parse(storedExams) : []
    } catch {
      return []
    }
  })
  const [examSaveMessage, setExamSaveMessage] = useState('')
  const [adminStudents, setAdminStudents] = useState([])
  const [adminTeachers, setAdminTeachers] = useState([])
  const [courses, setCourses] = useState(courseCards)
  const [adminStats, setAdminStats] = useState({ students: 0, teachers: 0, courses: 0, exams: 0 })
  const [studentAttendance, setStudentAttendance] = useState({ present: 0, absent: 0, percentage: '0%' })
  const [studentResults, setStudentResults] = useState([])

  useEffect(() => {
    if (!supabase) {
      window.localStorage.setItem('mrh-school-users', JSON.stringify(allUsers))
    }
  }, [allUsers])

  useEffect(() => {
    if (!supabase) {
      window.localStorage.setItem('mrh-school-exams', JSON.stringify(savedExams))
    }
  }, [savedExams])

  useEffect(() => {
    if (!supabase) return undefined

    let mounted = true

    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted || !data.session) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .maybeSingle()

      const user = {
        id: data.session.user.id,
        email: data.session.user.email,
        name: profile?.full_name || data.session.user.user_metadata?.full_name || 'MRH User',
        role: profile?.role || 'student',
        studentId: profile?.student_id || '',
        batch: profile?.batch || '',
        phone: profile?.phone || '',
      }

      if (mounted) {
        setCurrentUser(user)
        setRole(user.role)
        setIsAuthenticated(true)
        setView('dashboard')
      }
    }

    restoreSession()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!supabase || !isAuthenticated) return undefined

    let mounted = true
    const loadExams = async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && mounted) {
        setSavedExams((data || []).map((exam) => ({
          id: exam.id,
          title: exam.title,
          course: exam.batch || 'General Batch',
          subject: exam.subject,
          date: exam.exam_date || '',
          duration: `${exam.duration_minutes || 45} Minutes`,
          format: exam.question_format || 'Text',
          omr: exam.omr_enabled === false ? 'Disabled' : 'Enabled',
          pdfName: '',
          createdBy: exam.created_by || '',
        })))
      }
    }

    loadExams()
    return () => { mounted = false }
  }, [isAuthenticated])

  useEffect(() => {
    if (!supabase || !isAuthenticated || role !== 'student' || !currentUser?.id) return undefined

    let mounted = true
    const loadStudentData = async () => {
      const [{ data: attendance }, { data: submissions }] = await Promise.all([
        supabase.from('attendance').select('status').eq('student_id', currentUser.id),
        supabase.from('submissions').select('id, obtained_marks, percentage, submitted_at, exams(title)').eq('student_id', currentUser.id).order('submitted_at', { ascending: false }),
      ])

      if (!mounted) return
      const attendanceRows = attendance || []
      const present = attendanceRows.filter((row) => row.status === 'present').length
      const absent = attendanceRows.filter((row) => row.status === 'absent').length
      const total = present + absent
      setStudentAttendance({ present, absent, percentage: total ? `${Math.round((present / total) * 100)}%` : '0%' })
      setStudentResults((submissions || []).map((submission) => ({
        exam: submission.exams?.title || 'Exam',
        score: `${submission.obtained_marks || 0}`,
        percentage: `${submission.percentage || 0}%`,
        date: submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : '',
      })))
    }

    loadStudentData()
    return () => { mounted = false }
  }, [currentUser, isAuthenticated, role])

  useEffect(() => {
    if (!supabase || !isAuthenticated) return undefined

    let mounted = true
    const loadCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, subject, batch, teacher_id, created_at')
        .order('created_at', { ascending: false })

      if (!error && mounted) setCourses(data || [])
    }

    loadCourses()
    return () => { mounted = false }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'teacher'].includes(role)) return undefined

    let mounted = true
    const loadAdminData = async () => {
      if (!supabase) {
        const students = allUsers.filter((user) => user.role === 'student')
        const teachers = allUsers.filter((user) => user.role === 'teacher')
        if (mounted) {
          setAdminStudents(students)
          setAdminTeachers(teachers)
          setAdminStats({ students: students.length, teachers: teachers.length, courses: courses.length, exams: savedExams.length })
        }
        return
      }

      const [{ data: profiles, error: profilesError }, { count: examCount, error: examsError }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, student_id, role, batch, subject').order('created_at', { ascending: false }),
        supabase.from('exams').select('id', { count: 'exact', head: true }),
      ])

      if (!mounted) return
      if (profilesError || examsError) {
        console.error('Could not load admin data:', profilesError?.message || examsError?.message)
        return
      }

      const rows = profiles || []
      setAdminStudents(rows.filter((profile) => profile.role === 'student'))
      setAdminTeachers(rows.filter((profile) => profile.role === 'teacher'))
      setAdminStats({
        students: rows.filter((profile) => profile.role === 'student').length,
        teachers: rows.filter((profile) => profile.role === 'teacher').length,
        courses: courses.length,
        exams: examCount || 0,
      })
    }

    loadAdminData()
    return () => { mounted = false }
  }, [allUsers, courses, isAuthenticated, role, savedExams])

  const answeredCount = useMemo(
    () => Object.keys(answers).filter((key) => answers[key]).length,
    [answers],
  )

  const persistSubmission = useCallback(async (evaluation) => {
    if (!supabase || !currentUser?.id) return
    const examId = savedExams.find((exam) => Number.isInteger(Number(exam.id)))?.id
    if (!examId) return

    const { error } = await supabase.from('submissions').insert({
      exam_id: examId,
      student_id: currentUser.id,
      answers,
      obtained_marks: evaluation.obtained,
      percentage: evaluation.percentage,
    })

    if (error) console.error('Could not save submission:', error.message)
  }, [answers, currentUser, savedExams])

  const handleAutoSubmit = useCallback(async () => {
    if (examSubmitted) return
    const evaluation = calculateExamResult(answers)
    await persistSubmission(evaluation)
    setExamSubmitted(true)
    setExamPhase('submitted')
    setShowSubmitModal(false)
    setResult(evaluation)
  }, [answers, examSubmitted, persistSubmission])

  useEffect(() => {
    if (!isAuthenticated || examPhase !== 'started' || examSubmitted) return undefined

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isAuthenticated, examPhase, examSubmitted, handleAutoSubmit])

  const handleLogin = async (event) => {
    event.preventDefault()

    const enteredEmail = loginForm.email.trim().toLowerCase()
    const enteredPassword = loginForm.password

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: enteredEmail,
        password: enteredPassword,
      })

      if (error || !data.user) {
        alert(error?.message || 'Invalid email or password.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      const user = {
        id: data.user.id,
        email: data.user.email,
        name: profile?.full_name || data.user.user_metadata?.full_name || 'MRH User',
        role: profile?.role || 'student',
        studentId: profile?.student_id || '',
        batch: profile?.batch || '',
        phone: profile?.phone || '',
      }

      setRole(user.role)
      setCurrentUser(user)
      setIsAuthenticated(true)
      setView('dashboard')
      setExamPhase('instructions')
      setCurrentQuestionIndex(0)
      setShowSubmitModal(false)
      setLoginForm({ email: '', password: '' })
      return
    }

    const user = allUsers.find(
      (item) =>
        (item.email.toLowerCase() === enteredEmail || String(item.id) === enteredEmail) &&
        item.password === enteredPassword,
    )

    if (user) {
      setRole(user.role)
      setCurrentUser(user)
      setIsAuthenticated(true)
      setView('dashboard')
      setExamPhase('instructions')
      setCurrentQuestionIndex(0)
      setShowSubmitModal(false)
      setLoginForm({ email: '', password: '' })
      return
    }

    alert('Invalid email or password. Please use a valid MRH SCHOOL account.')
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    const normalizedEmail = registerForm.email.trim().toLowerCase()

    if (!registerForm.name.trim() || !normalizedEmail || !registerForm.password) {
      alert('Please complete all required registration fields.')
      return
    }

    if (supabase) {
      const studentId = registerForm.studentId.trim() || `MRH-${Date.now().toString().slice(-4)}`
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: registerForm.password,
        options: { data: { full_name: registerForm.name.trim(), student_id: studentId } },
      })

      if (error || !data.user) {
        alert(error?.message || 'Registration failed. Please try again.')
        return
      }

      if (data.session) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: registerForm.name.trim(),
          student_id: studentId,
          role: 'student',
        })

        if (profileError) {
          alert(`Account created, but profile could not be saved: ${profileError.message}`)
          return
        }
      }

      setRegisterForm({ name: '', email: '', password: '', studentId: '' })
      setLoginForm({ email: normalizedEmail, password: '' })
      setView('login')
      alert(data.session ? 'Registration successful. You can now log in.' : 'Registration successful. Check your email, then log in.')
      return
    }

    if (allUsers.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      alert('An account with this email already exists. Please log in.')
      setView('login')
      return
    }

    const newStudent = {
      id: Date.now(),
      name: registerForm.name.trim(),
      email: normalizedEmail,
      password: registerForm.password,
      role: 'student',
      studentId: registerForm.studentId || `MRH-${Date.now().toString().slice(-4)}`,
    }

    setAllUsers((prev) => [newStudent, ...prev])
    setRegisterForm({ name: '', email: '', password: '', studentId: '' })
    setLoginForm({ email: newStudent.email, password: '' })
    setView('login')
    alert('Registration successful. Please log in with your new account.')
  }

  const handleSaveExam = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') || '').trim()

    if (!title) {
      setExamSaveMessage('Please enter an exam title before saving.')
      return
    }

    const newExam = {
      id: Date.now(),
      title,
      course: String(formData.get('course') || 'General Batch'),
      subject: String(formData.get('subject') || 'General'),
      date: String(formData.get('date') || ''),
      duration: String(formData.get('duration') || '45 Minutes'),
      format: String(formData.get('format') || 'Text'),
      omr: String(formData.get('omr') || 'Enabled'),
      pdfName: formData.get('pdf')?.name || '',
      createdBy: currentUser?.name || 'Teacher',
    }

    if (supabase) {
      let pdfUrl = null
      const pdfFile = formData.get('pdf')
      if (pdfFile instanceof File && pdfFile.size > 0) {
        const filePath = `${currentUser?.id || 'shared'}/${Date.now()}-${pdfFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('exam-pdfs')
          .upload(filePath, pdfFile, { contentType: 'application/pdf', upsert: false })

        if (uploadError) {
          setExamSaveMessage(`PDF upload failed: ${uploadError.message}`)
          return
        }

        const { data: publicFile } = supabase.storage.from('exam-pdfs').getPublicUrl(filePath)
        pdfUrl = publicFile.publicUrl
      }

      const { data, error } = await supabase.from('exams').insert({
        title: newExam.title,
        subject: newExam.subject,
        batch: newExam.course,
        exam_date: newExam.date || null,
        duration_minutes: Number.parseInt(newExam.duration, 10) || 45,
        total_marks: 10,
        question_format: newExam.format.toLowerCase(),
        omr_enabled: newExam.omr === 'Enabled',
        pdf_url: pdfUrl,
        status: 'published',
        created_by: currentUser?.id || null,
      }).select().single()

      if (error) {
        setExamSaveMessage(`Could not save exam: ${error.message}`)
        return
      }

      newExam.id = data.id

      const questionData = {
        exam_id: data.id,
        question_text: String(formData.get('questionText') || '').trim(),
        option_a: String(formData.get('optionA') || '').trim(),
        option_b: String(formData.get('optionB') || '').trim(),
        option_c: String(formData.get('optionC') || '').trim(),
        option_d: String(formData.get('optionD') || '').trim(),
        correct_answer: String(formData.get('correctAnswer') || 'A'),
        marks: Number(formData.get('marks') || 2),
      }

      if (questionData.question_text) {
        const { error: questionError } = await supabase.from('questions').insert(questionData)
        if (questionError) {
          setExamSaveMessage(`Exam saved, but question could not be saved: ${questionError.message}`)
          return
        }
      }
    }

    setSavedExams((prev) => [newExam, ...prev])
    setExamSaveMessage(`Saved: ${newExam.title}${newExam.pdfName ? ` (${newExam.pdfName})` : ''}`)
    event.currentTarget.reset()
  }

  const handleAddCourse = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const course = {
      name: String(formData.get('name') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      batch: String(formData.get('batch') || '').trim(),
      teacher_id: String(formData.get('teacherId') || '').trim() || null,
      created_by: currentUser?.id || null,
    }

    if (!course.name || !course.subject) {
      setExamSaveMessage('Course name and subject are required.')
      return
    }

    if (supabase) {
      const { data, error } = await supabase.from('courses').insert(course).select().single()
      if (error) {
        setExamSaveMessage(`Could not save course: ${error.message}`)
        return
      }
      setCourses((prev) => [data, ...prev])
    } else {
      setCourses((prev) => [{ ...course, id: Date.now() }, ...prev])
    }

    setExamSaveMessage(`Course saved: ${course.name}`)
    event.currentTarget.reset()
  }

  const handleAddTeacher = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const teacher = {
      id: String(formData.get('userId') || '').trim(),
      full_name: String(formData.get('name') || '').trim(),
      student_id: String(formData.get('teacherId') || '').trim(),
      role: 'teacher',
      subject: String(formData.get('subject') || '').trim(),
    }

    if (!teacher.id || !teacher.full_name) {
      setExamSaveMessage('Existing Supabase Auth User ID and teacher name are required.')
      return
    }

    if (supabase) {
      const { data, error } = await supabase.from('profiles').upsert(teacher).select().single()
      if (error) {
        setExamSaveMessage(`Could not add teacher: ${error.message}`)
        return
      }
      setAdminTeachers((prev) => [data, ...prev.filter((item) => item.id !== data.id)])
    } else {
      setAdminTeachers((prev) => [teacher, ...prev])
    }

    setAdminStats((prev) => ({ ...prev, teachers: prev.teachers + 1 }))
    setExamSaveMessage(`Teacher added: ${teacher.full_name}`)
    event.currentTarget.reset()
  }

  const handleAnswerSelect = (option) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: option }))
    setReviewMap((prev) => ({ ...prev, [currentQuestionIndex]: false }))
  }

  const handleMarkForReview = () => {
    setReviewMap((prev) => ({ ...prev, [currentQuestionIndex]: !prev[currentQuestionIndex] }))
  }

  const handleClearAnswer = () => {
    setAnswers((prev) => {
      const next = { ...prev }
      delete next[currentQuestionIndex]
      return next
    })
    setReviewMap((prev) => ({ ...prev, [currentQuestionIndex]: false }))
  }

  const submitExam = async () => {
    const evaluation = calculateExamResult(answers)
    await persistSubmission(evaluation)
    setResult(evaluation)
    setExamSubmitted(true)
    setExamPhase('submitted')
    setShowSubmitModal(false)
  }

  const currentQuestion = examQuestions[currentQuestionIndex]
  const currentStatus = getStatusText(answers, reviewMap, currentQuestionIndex)
  const timeWarning = timeRemaining <= 60 ? 'critical' : timeRemaining <= 300 ? 'warning' : ''
  const availableExams = savedExams.length > 0 ? savedExams : upcomingExams
  const availableResults = studentResults.length > 0 ? studentResults : (supabase ? [] : recentResults)

  const pageContent = () => {
    if (!isAuthenticated) {
      return (
        <>
          <header className="public-header">
            <div className="brand-block">
              <div className="brand-mark">MRH</div>
              <div>
                <div className="brand-name">MRH SCHOOL</div>
                <small>Private Tuition & Coaching Center</small>
              </div>
            </div>
            <nav className="public-nav">
              {publicLinks.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={view === item.key ? 'nav-link active' : 'nav-link'}
                  onClick={() => setView(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          {view === 'home' && (
            <main className="public-page">
              <section className="hero-panel">
                <div>
                  <span className="eyebrow">Professional learning hub</span>
                  <h1>Education that keeps students focused and progressing.</h1>
                  <p>
                    MRH School helps students improve attendance, track academic performance,
                    and access structured online assessments with a clear OMR exam experience.
                  </p>
                  <div className="cta-row">
                    <button type="button" className="primary-btn" onClick={() => { setView('login'); setRole('student') }}>
                      Student Login
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => setView('courses')}>
                      Explore Courses
                    </button>
                  </div>
                </div>
                <div className="hero-card">
                  <div className="mini-stat">
                    <strong>1,200+</strong>
                    <span>Students</span>
                  </div>
                  <div className="mini-stat">
                    <strong>95%</strong>
                    <span>Attendance</span>
                  </div>
                  <div className="mini-stat">
                    <strong>18</strong>
                    <span>Active Batches</span>
                  </div>
                </div>
              </section>

              <section className="card-grid three-up">
                <div className="info-card">
                  <h3>Student Management</h3>
                  <p>Monitor profiles, enrollment, and academic status in one place.</p>
                </div>
                <div className="info-card">
                  <h3>Teacher Tools</h3>
                  <p>Manage attendance, set exams, and review performance quickly.</p>
                </div>
                <div className="info-card">
                  <h3>OMR Exam Portal</h3>
                  <p>Deliver clear MCQ assessments with timer and direct answer selection.</p>
                </div>
              </section>
            </main>
          )}

          {view === 'about' && (
            <main className="public-page narrow">
              <section className="content-panel">
                <h2>About MRH SCHOOL</h2>
                <p>
                  MRH SCHOOL is built to support private coaching and tuition centers with a practical,
                  lightweight system for student tracking, teacher coordination, and online assessment.
                </p>
                <p>
                  We focus on clarity, efficiency, and an exam experience that feels straightforward for
                  both students and staff.
                </p>
              </section>
            </main>
          )}

          {view === 'courses' && (
            <main className="public-page narrow">
              <section className="content-panel">
                <h2>Courses</h2>
                <div className="card-grid three-up">
                  {courses.map((course) => (
                    <div className="info-card" key={course.name}>
                      <h3>{course.name}</h3>
                      <p>{course.students} students</p>
                      <small>Teacher: {course.teacher}</small>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          )}

          {view === 'contact' && (
            <main className="public-page narrow">
              <section className="content-panel">
                <h2>Contact</h2>
                <p>Phone: +880 1700-000000</p>
                <p>Email: info@mrhschool.com</p>
                <p>Address: Dhaka, Bangladesh</p>
              </section>
            </main>
          )}

          {(view === 'login' || view === 'register') && (
            <main className="public-page login-page">
              <section className="login-card">
                <div className="login-header">
                  <div className="brand-mark small">MRH</div>
                  <div>
                    <h2>{view === 'register' ? 'Create Account' : 'Student Login'}</h2>
                    <small>{view === 'register' ? 'New student registration' : 'Private coaching portal'}</small>
                  </div>
                </div>

                <div className="auth-tabs">
                  <button type="button" className={view === 'login' ? 'tab-btn active' : 'tab-btn'} onClick={() => setView('login')}>
                    Login
                  </button>
                  <button type="button" className={view === 'register' ? 'tab-btn active' : 'tab-btn'} onClick={() => setView('register')}>
                    Register
                  </button>
                </div>

                {view === 'login' && (
                  <>
                    {showRolePicker && (
                      <div className="role-switcher">
                        {['student', 'teacher', 'admin'].map((item) => (
                          <button
                            key={item}
                            type="button"
                            className={role === item ? 'role-btn active' : 'role-btn'}
                            onClick={() => setRole(item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleLogin}>
                      <label>
                        Email / Student ID
                        <input
                          type="text"
                          value={loginForm.email}
                          onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                          placeholder={role === 'student' ? 'student@mrhschool.com' : `${role}@mrhschool.com`}
                        />
                      </label>
                      <label>
                        Password
                        <input
                          type="password"
                          value={loginForm.password}
                          onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                          placeholder="123456"
                        />
                      </label>
                      <button type="submit" className="primary-btn full-width">
                        Login
                      </button>
                    </form>

                    <div className="demo-box">
                      <strong>Demo credentials</strong>
                      <p>Student: student@mrhschool.com / 123456</p>
                      <p>Teacher: teacher@mrhschool.com / 123456</p>
                      <p>Admin: admin@mrhschool.com / 123456</p>
                      <button type="button" className="mini-link" onClick={() => setShowRolePicker((prev) => !prev)}>
                        {showRolePicker ? 'Hide staff login' : 'Teacher / Admin access'}
                      </button>
                    </div>
                  </>
                )}

                {view === 'register' && (
                  <form onSubmit={handleRegister}>
                    <label>
                      Full Name
                      <input
                        type="text"
                        value={registerForm.name}
                        onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                        placeholder="Student name"
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label>
                      Student ID (optional)
                      <input
                        type="text"
                        value={registerForm.studentId}
                        onChange={(event) => setRegisterForm({ ...registerForm, studentId: event.target.value })}
                        placeholder="MRH-1001"
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        value={registerForm.password}
                        onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                        placeholder="Create password"
                      />
                    </label>
                    <button type="submit" className="primary-btn full-width">
                      Register
                    </button>
                  </form>
                )}
              </section>
            </main>
          )}
        </>
      )
    }

    const navItems = role === 'student' ? studentNav : role === 'teacher' ? teacherNav : adminNav

    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-box">
            <div className="brand-mark">MRH</div>
            <div>
              <h3>MRH SCHOOL</h3>
              <small>{role}</small>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={view === item.key ? 'side-link active' : 'side-link'}
                onClick={() => {
                  setView(item.key)
                  if (item.key === 'examInstructions') setExamPhase('instructions')
                  if (item.key === 'dashboard') setView('dashboard')
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button type="button" className="logout-btn" onClick={async () => { if (supabase) await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(null); setView('home'); setRole('student'); setLoginForm({ email: '', password: '' }) }}>
            Logout
          </button>
        </aside>

        <main className="main-panel">
          <header className="topbar">
            <div>
              <span className="eyebrow">{role.charAt(0).toUpperCase() + role.slice(1)} Portal</span>
              <h2>{view === 'dashboard' ? `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard` : view}</h2>
            </div>
            <div className="profile-pill">{currentUser?.name || 'MRH User'}</div>
          </header>

          {role === 'student' && view === 'dashboard' && (
            <>
              <section className="stats-grid">
                <div className="stat-card"><span>My Courses</span><strong>4</strong></div>
                <div className="stat-card"><span>Attendance</span><strong>88.89%</strong></div>
                <div className="stat-card"><span>Upcoming Exams</span><strong>3</strong></div>
                <div className="stat-card"><span>Latest Result</span><strong>84%</strong></div>
              </section>

              <section className="table-panel">
                <h3>Upcoming Exams</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableExams.map((item) => (
                      <tr key={item.exam}>
                        <td>{item.exam}</td>
                        <td>{item.subject}</td>
                        <td>{item.date}</td>
                        <td>{item.duration}</td>
                        <td>{item.status}</td>
                        <td><button type="button" className="table-action" onClick={() => setView('examInstructions')}>{item.status === 'Ready' ? 'Start Exam' : 'View'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="results-panel">
                <h3>Recent Results</h3>
                <div className="result-list">
                  {availableResults.map((item) => (
                    <div key={item.exam} className="result-item">
                      <div>
                        <strong>{item.exam}</strong>
                        <small>{item.date}</small>
                      </div>
                      <span>{item.score}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {role === 'student' && view === 'profile' && (
            <section className="content-panel">
              <h3>My Profile</h3>
              <div className="profile-grid">
                <div className="profile-info"><strong>Name:</strong> {currentUser?.name || '-'}</div>
                <div className="profile-info"><strong>Student ID:</strong> {currentUser?.studentId || '-'}</div>
                <div className="profile-info"><strong>Email:</strong> {currentUser?.email || '-'}</div>
                <div className="profile-info"><strong>Batch:</strong> {currentUser?.batch || 'Not assigned'}</div>
                <div className="profile-info"><strong>Phone:</strong> {currentUser?.phone || 'Not added'}</div>
                <div className="profile-info"><strong>Status:</strong> Active</div>
              </div>
            </section>
          )}

          {role === 'student' && view === 'courses' && (
            <section className="content-panel">
              <h3>My Courses</h3>
              <div className="card-grid three-up">
                {courseCards.map((course) => (
                  <div key={course.name} className="info-card">
                    <h4>{course.name}</h4>
                    <p>{course.teacher}</p>
                    <small>{course.students} enrolled students</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          {role === 'student' && view === 'attendance' && (
            <section className="content-panel">
              <h3>Attendance</h3>
              <div className="attendance-summary">
                <div><span>Present</span><strong>{studentAttendance.present}</strong></div>
                <div><span>Absent</span><strong>{studentAttendance.absent}</strong></div>
                <div><span>Attendance</span><strong>{studentAttendance.percentage}</strong></div>
              </div>
            </section>
          )}

          {role === 'student' && (view === 'upcomingExams' || view === 'examInstructions' || view === 'previousResults') && (
            <section className="content-panel">
              {view === 'upcomingExams' && (
                <>
                  <h3>Upcoming Exams</h3>
                  <div className="exam-list">
                    {availableExams.map((exam) => (
                      <div key={exam.exam} className="exam-box">
                        <div>
                          <strong>{exam.exam}</strong>
                          <small>{exam.subject}</small>
                        </div>
                        <button type="button" className="primary-btn" onClick={() => setView('examInstructions')}>
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {view === 'examInstructions' && (
                <div className="exam-instructions">
                  <h3>Exam Instructions</h3>
                  <div className="exam-meta">
                    <div><span>Exam Name</span><strong>Final Mathematics Quiz</strong></div>
                    <div><span>Subject</span><strong>Mathematics</strong></div>
                    <div><span>Total Questions</span><strong>5</strong></div>
                    <div><span>Total Marks</span><strong>10</strong></div>
                    <div><span>Duration</span><strong>45 Minutes</strong></div>
                    <div><span>Start Time</span><strong>09:00 AM</strong></div>
                  </div>
                  <ul>
                    <li>Read each question carefully before selecting an answer.</li>
                    <li>Only one answer is correct for each MCQ.</li>
                    <li>Do not refresh the page during the exam.</li>
                    <li>Time is counted continuously once the exam starts.</li>
                    <li>Once submitted, the exam will be locked and results generated automatically.</li>
                  </ul>
                  <button type="button" className="primary-btn" onClick={() => {
                    setExamPhase('started')
                    setExamSubmitted(false)
                    setTimeRemaining(examStats.durationMinutes * 60)
                    setView('dashboard')
                  }}>
                    Start Exam
                  </button>
                </div>
              )}

              {view === 'previousResults' && (
                <>
                  <h3>Previous Results</h3>
                  <div className="result-list large">
                    {availableResults.map((item) => (
                      <div className="result-item" key={item.exam}>
                        <div>
                          <strong>{item.exam}</strong>
                          <small>{item.date}</small>
                        </div>
                        <span>{item.percentage}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {role === 'student' && examPhase === 'started' && (
            <div className="omr-layout">
              <div className="omr-main">
                <div className="question-toolbar">
                  <span>Question {currentQuestionIndex + 1}</span>
                  <span>{currentStatus}</span>
                </div>
                <h3>{currentQuestion.question}</h3>
                <div className="option-list">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const optionKey = String.fromCharCode(65 + optionIndex)
                    const selected = answers[currentQuestionIndex] === optionKey
                    return (
                      <button
                        type="button"
                        key={optionKey}
                        className={selected ? 'option-btn selected' : 'option-btn'}
                        onClick={() => handleAnswerSelect(optionKey)}
                      >
                        <span className="option-letter">{optionKey}</span>
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <aside className="omr-panel">
                <div className="timer-box">
                  <span>Time Remaining</span>
                  <strong className={timeWarning}>{formatTime(timeRemaining)}</strong>
                  {timeRemaining <= 300 && timeRemaining > 60 && <small className="warning-text">Warning: 5 minutes left</small>}
                  {timeRemaining <= 60 && <small className="warning-text danger">Critical: 1 minute left</small>}
                </div>
                <div className="panel-metrics">
                  <div><span>Answered</span><strong>{answeredCount}</strong></div>
                  <div><span>Remaining</span><strong>{examQuestions.length - answeredCount}</strong></div>
                </div>

                <div className="omr-grid">
                  {examQuestions.map((question, index) => {
                    const isCurrent = currentQuestionIndex === index
                    const status = getStatusText(answers, reviewMap, index)

                    return (
                      <button
                        key={question.id}
                        type="button"
                        className={[
                          'nav-chip',
                          isCurrent ? 'current' : '',
                          status === 'answered' ? 'answered' : '',
                          status === 'review' ? 'review' : '',
                        ].join(' ')}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {index + 1}
                        <span>{status === 'answered' ? '✓' : status === 'review' ? '!' : '?'}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="omr-answers">
                  {examQuestions.map((question, index) => (
                    <div key={question.id} className="omr-row">
                      <span>{index + 1}</span>
                      <div className="answer-bubbles">
                        {['A', 'B', 'C', 'D'].map((letter) => (
                          <button
                            type="button"
                            key={letter}
                            className={answers[index] === letter ? 'bubble active' : 'bubble'}
                            onClick={() => {
                              setCurrentQuestionIndex(index)
                              handleAnswerSelect(letter)
                            }}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="exam-actions">
                  <button type="button" className="secondary-btn" onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}>Previous</button>
                  <button type="button" className="secondary-btn" onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, examQuestions.length - 1))}>Next</button>
                  <button type="button" className="secondary-btn" onClick={handleMarkForReview}>Mark for Review</button>
                  <button type="button" className="secondary-btn" onClick={handleClearAnswer}>Clear Answer</button>
                  <button type="button" className="primary-btn" onClick={() => setShowSubmitModal(true)}>Submit Exam</button>
                </div>
              </aside>
            </div>
          )}

          {role === 'student' && examPhase === 'submitted' && result && (
            <section className="content-panel result-panel">
              <h3>Exam Result</h3>
              <div className="result-summary">
                <div><span>Total Questions</span><strong>{result.totalQuestions}</strong></div>
                <div><span>Correct</span><strong>{result.correct}</strong></div>
                <div><span>Wrong</span><strong>{result.wrong}</strong></div>
                <div><span>Unanswered</span><strong>{result.unanswered}</strong></div>
                <div><span>Total Marks</span><strong>{result.totalMarks}</strong></div>
                <div><span>Obtained</span><strong>{result.obtained}</strong></div>
                <div><span>Percentage</span><strong>{result.percentage}%</strong></div>
              </div>
            </section>
          )}

          {role === 'teacher' && view === 'dashboard' && (
            <>
              <section className="stats-grid">
                <div className="stat-card"><span>Total Students</span><strong>{adminStats.students}</strong></div>
                <div className="stat-card"><span>Courses</span><strong>{adminStats.courses}</strong></div>
                <div className="stat-card"><span>Exams</span><strong>{adminStats.exams}</strong></div>
                <div className="stat-card"><span>Portal Status</span><strong>Live</strong></div>
              </section>
              <section className="quick-actions">
                <button type="button" className="primary-btn" onClick={() => setView('createExam')}>Create Exam</button>
                <button type="button" className="secondary-btn" onClick={() => setView('attendance')}>Take Attendance</button>
                <button type="button" className="secondary-btn" onClick={() => setView('students')}>View Students</button>
                <button type="button" className="secondary-btn" onClick={() => setView('results')}>View Results</button>
              </section>
            </>
          )}

          {role === 'teacher' && view === 'createExam' && (
            <section className="content-panel">
              <h3>Create Exam</h3>
                  <form className="exam-form" onSubmit={handleSaveExam}>
                <div className="two-col">
                  <label>Exam Title<input name="title" type="text" defaultValue="Final Mathematics Quiz" /></label>
                  <label>Course/Batch<input name="course" type="text" defaultValue="HSC Science" /></label>
                </div>
                <div className="two-col">
                  <label>Subject<input name="subject" type="text" defaultValue="Mathematics" /></label>
                  <label>Exam Date<input name="date" type="date" defaultValue="2026-09-27" /></label>
                </div>
                <div className="two-col">
                  <label>Start Time<input name="startTime" type="time" defaultValue="09:00" /></label>
                  <label>Duration<input name="duration" type="text" defaultValue="45 Minutes" /></label>
                </div>
                <div className="two-col">
                  <label>Total Marks<input type="number" defaultValue="10" /></label>
                  <label>Status<select defaultValue="Published"><option>Draft</option><option>Published</option></select></label>
                </div>
                <div className="two-col">
                  <label>Question Format<select name="format" defaultValue="Text"><option>Text</option><option>PDF</option></select></label>
                  <label>OMR Sheet<select name="omr" defaultValue="Enabled"><option>Enabled</option><option>Disabled</option></select></label>
                </div>
                <label>Instructions<textarea defaultValue="Read the questions carefully and submit before time ends." /></label>
                <div className="question-block">
                  <h4>Question 1</h4>
                  <label>Question Text<input name="questionText" type="text" defaultValue="What is the capital of Bangladesh?" /></label>
                  <div className="two-col">
                    <label>Option A<input name="optionA" type="text" defaultValue="Dhaka" /></label>
                    <label>Option B<input name="optionB" type="text" defaultValue="Chattogram" /></label>
                  </div>
                  <div className="two-col">
                    <label>Option C<input name="optionC" type="text" defaultValue="Sylhet" /></label>
                    <label>Option D<input name="optionD" type="text" defaultValue="Khulna" /></label>
                  </div>
                  <div className="two-col">
                    <label>Correct Answer<select name="correctAnswer" defaultValue="A"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
                    <label>Marks<input name="marks" type="number" defaultValue="2" /></label>
                  </div>
                  <label className="upload-box">
                    PDF Question Sheet (Optional)
                    <input name="pdf" type="file" accept="application/pdf" />
                  </label>
                </div>
                <div className="inline-actions">
                  <button type="button" className="primary-btn" onClick={() => setExamSaveMessage('Question editor is ready for the next question.')}>Add Question</button>
                  <button type="submit" className="secondary-btn">Save Exam</button>
                </div>
                {examSaveMessage && <small className="form-message">{examSaveMessage}</small>}
              </form>
            </section>
          )}

          {role === 'teacher' && view === 'manageExams' && (
            <section className="content-panel">
              <h3>Manage Exams</h3>
              {savedExams.length === 0 ? (
                <p>No saved exams yet. Create your first exam from the Create Exam menu.</p>
              ) : (
                <div className="exam-list">
                  {savedExams.map((exam) => (
                    <div className="exam-box" key={exam.id}>
                      <div>
                        <strong>{exam.title}</strong>
                        <small>{exam.subject} · {exam.format} · OMR {exam.omr}</small>
                        {exam.pdfName && <small>PDF: {exam.pdfName}</small>}
                      </div>
                      <span>{exam.date || 'No date'}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {role === 'teacher' && view === 'attendance' && (
            <section className="content-panel">
              <h3>Attendance Management</h3>
              <div className="attendance-form">
                <label>Course/Batch<select defaultValue="HSC Science"><option>HSC Science</option><option>SSC Foundation</option></select></label>
                <label>Date<input type="date" defaultValue="2026-09-27" /></label>
              </div>
              <table>
                <thead>
                  <tr><th>Student</th><th>Present</th><th>Absent</th></tr>
                </thead>
                <tbody>
                  <tr><td>Arif Hossain</td><td><input type="radio" name="arif" defaultChecked /></td><td><input type="radio" name="arif" /></td></tr>
                  <tr><td>Shamima Khatun</td><td><input type="radio" name="shamima" defaultChecked /></td><td><input type="radio" name="shamima" /></td></tr>
                  <tr><td>Rakib Ahmed</td><td><input type="radio" name="rakib" /></td><td><input type="radio" name="rakib" defaultChecked /></td></tr>
                </tbody>
              </table>
              <button type="button" className="primary-btn">Save Attendance</button>
            </section>
          )}

          {role === 'admin' && view === 'dashboard' && (
            <>
              <section className="stats-grid">
                <div className="stat-card"><span>Total Students</span><strong>{adminStats.students}</strong></div>
                <div className="stat-card"><span>Total Teachers</span><strong>{adminStats.teachers}</strong></div>
                <div className="stat-card"><span>Total Courses</span><strong>{adminStats.courses}</strong></div>
                <div className="stat-card"><span>Active Exams</span><strong>{adminStats.exams}</strong></div>
              </section>

              <section className="quick-actions">
                <button type="button" className="primary-btn" onClick={() => setView('students')}>Manage Students</button>
                <button type="button" className="secondary-btn" onClick={() => setView('teachers')}>Manage Teachers</button>
                <button type="button" className="secondary-btn" onClick={() => setView('exams')}>Manage Exams</button>
                <button type="button" className="secondary-btn" onClick={() => setView('settings')}>Settings</button>
              </section>

              <section className="activity-panel">
                <h3>Recent Activity</h3>
                <ul>
                  <li>New student enrolled in SSC Foundation</li>
                  <li>New math exam published for HSC Science</li>
                  <li>5 exams submitted by students</li>
                  <li>Attendance updated for Batch 10</li>
                </ul>
              </section>
            </>
          )}

          {role === 'admin' && view === 'students' && (
            <section className="content-panel">
              <h3>Students</h3>
              <table>
                <thead>
                  <tr><th>Name</th><th>Student ID</th><th>Batch</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {adminStudents.length === 0 ? (
                    <tr><td colSpan="4">No students registered yet.</td></tr>
                  ) : adminStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.full_name || student.name}</td>
                      <td>{student.student_id || student.studentId || '-'}</td>
                      <td>{student.batch || 'Not assigned'}</td>
                      <td>Active</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {role === 'admin' && view === 'teachers' && (
            <section className="content-panel">
              <h3>Teachers</h3>
              <form className="exam-form" onSubmit={handleAddTeacher}>
                <h4>Add Teacher Profile</h4>
                <p>First create the account in Supabase Authentication, then paste its User ID here.</p>
                <div className="two-col">
                  <label>Auth User ID<input name="userId" type="text" placeholder="Supabase user UUID" /></label>
                  <label>Teacher Name<input name="name" type="text" placeholder="Full name" /></label>
                </div>
                <div className="two-col">
                  <label>Teacher ID<input name="teacherId" type="text" placeholder="TEACHER-001" /></label>
                  <label>Subject<input name="subject" type="text" placeholder="Mathematics" /></label>
                </div>
                <button type="submit" className="primary-btn">Add Teacher</button>
              </form>
              {examSaveMessage && <small className="form-message">{examSaveMessage}</small>}
              <table>
                <thead>
                  <tr><th>Name</th><th>Subject</th><th>Courses</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {adminTeachers.length === 0 ? (
                    <tr><td colSpan="4">No teachers registered yet.</td></tr>
                  ) : adminTeachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.full_name || teacher.name}</td>
                      <td>{teacher.subject || 'Not assigned'}</td>
                      <td>{teacher.courses || 0}</td>
                      <td>Active</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {role === 'admin' && view === 'courses' && (
            <section className="content-panel">
              <h3>Courses / Batches</h3>
              <form className="exam-form" onSubmit={handleAddCourse}>
                <div className="two-col">
                  <label>Course Name<input name="name" type="text" placeholder="HSC Science" /></label>
                  <label>Subject<input name="subject" type="text" placeholder="Mathematics" /></label>
                </div>
                <div className="two-col">
                  <label>Batch<input name="batch" type="text" placeholder="HSC 2027" /></label>
                  <label>Teacher ID (optional)<input name="teacherId" type="text" placeholder="Supabase user UUID" /></label>
                </div>
                <button type="submit" className="primary-btn">Add Course</button>
              </form>
              {examSaveMessage && <small className="form-message">{examSaveMessage}</small>}
              <div className="exam-list">
                {courses.length === 0 ? <p>No courses added yet.</p> : courses.map((course) => (
                  <div className="exam-box" key={course.id || course.name}>
                    <div><strong>{course.name}</strong><small>{course.subject} · {course.batch || 'No batch'}</small></div>
                    <span>{course.teacher_id ? 'Assigned' : 'Unassigned'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {role === 'admin' && view === 'exams' && (
            <section className="content-panel">
              <h3>Exams</h3>
              {savedExams.length === 0 ? (
                <p>No exams have been created yet.</p>
              ) : (
                <div className="exam-list">
                  {savedExams.map((exam) => (
                    <div className="exam-box" key={exam.id}>
                      <div>
                        <strong>{exam.title}</strong>
                        <small>{exam.subject} · {exam.format} · OMR {exam.omr}</small>
                      </div>
                      <span>{exam.date || 'No date'}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {role === 'admin' && view === 'settings' && (
            <section className="content-panel">
              <h3>Settings</h3>
              <div className="settings-list">
                <label>School Name<input type="text" defaultValue="MRH SCHOOL" /></label>
                <label>Email<input type="email" defaultValue="info@mrhschool.com" /></label>
                <label>Phone<input type="text" defaultValue="+880 1700-000000" /></label>
              </div>
              <button type="button" className="primary-btn">Save Settings</button>
            </section>
          )}
        </main>
      </div>
    )
  }

  return (
    <>
      {pageContent()}

      {showSubmitModal && (
        <div className="modal-backdrop" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Submit Exam</h3>
            <p>Are you sure you want to submit your exam?</p>
            <div className="modal-summary">
              <span>Answered: {answeredCount}</span>
              <span>Unanswered: {examQuestions.length - answeredCount}</span>
              <span>Marked: {Object.values(reviewMap).filter(Boolean).length}</span>
              <span>Total: {examQuestions.length}</span>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowSubmitModal(false)}>Continue Exam</button>
              <button type="button" className="primary-btn" onClick={submitExam}>Submit Exam</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
