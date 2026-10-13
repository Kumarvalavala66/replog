import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity, ArrowDown, ArrowUp, ArrowUpRight, BarChart3, Copy, Edit2, Trash2,
  CalendarDays, Check, ChevronRight, Clock3, Dumbbell,
  History, LayoutDashboard, LoaderCircle, Plus, Search,
  Target, X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from './services/api'
import ConfirmDialog from './components/ConfirmDialog'
import EmptyState from './components/EmptyState'
import ExerciseAnimation from './components/ExerciseAnimation'
import ExerciseDetailPanel from './components/ExerciseDetailPanel'
import ExercisePreview from './components/ExercisePreview'
import LiveWorkout from './components/LiveWorkout'
import './App.css'

const NAV = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'workouts', label: 'Workouts', icon: Activity },
  { id: 'plans', label: 'Training plans', icon: CalendarDays },
  { id: 'exercises', label: 'Exercise library', icon: Dumbbell },
  { id: 'history', label: 'History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

const TITLES = {
  dashboard: ['YOUR TRAINING, AT A GLANCE', 'Overview'],
  workouts: ['PUT IN THE WORK', 'Workouts'],
  plans: ['TRAIN WITH INTENTION', 'Training plans'],
  exercises: ['BUILD YOUR MOVEMENT LIBRARY', 'Exercise library'],
  history: ['EVERY SESSION COUNTS', 'Workout history'],
  analytics: ['MEASURE YOUR PROGRESS', 'Analytics'],
}

const TODAY_LABEL = new Date().toLocaleDateString(undefined, {
  weekday: 'long', day: 'numeric', month: 'short',
})

function formatDate(value) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDuration(start, end) {
  if (!start || !end) return 'In progress'
  const mins = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000))
  return `${mins} min`
}

function localDateTime() {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return date.toISOString().slice(0, 16)
}

function Stat({ label, value, suffix, icon: Icon }) {
  return (
    <article className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={17} strokeWidth={1.7} />
      </div>
      <div className="stat-value">
        {value ?? '—'}{suffix && <span>{suffix}</span>}
      </div>
    </article>
  )
}

const PAGE_IDS = NAV.map((item) => item.id)

function pageFromPath(pathname) {
  const id = pathname.replace(/^\//, '') || 'dashboard'
  return PAGE_IDS.includes(id) ? id : 'dashboard'
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageFromPath(location.pathname)
  const setPage = (id) => navigate(id === 'dashboard' ? '/' : `/${id}`)
  const [summary, setSummary] = useState(null)
  const [weekly, setWeekly] = useState([])
  const [muscles, setMuscles] = useState([])
  const [exercises, setExercises] = useState([])
  const [plans, setPlans] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [exerciseForm, setExerciseForm] = useState(false)
  const [exerciseDraft, setExerciseDraft] = useState({
    name: '', muscle_group: 'Chest', equipment: 'Dumbbell', instructions: '',
  })
  const [workoutTitle, setWorkoutTitle] = useState('Training session')
  const [muscleFilter, setMuscleFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [planForm, setPlanForm] = useState(false)
  const [planDraft, setPlanDraft] = useState({
    name: '', description: '', exercise_ids: [], target_sets: 3,
    target_reps_min: 8, target_reps_max: 12, target_weight_kg: '',
  })
  const [manualForm, setManualForm] = useState(false)
  const [manualDraft, setManualDraft] = useState({
    title: '', performed_at: localDateTime(), duration_minutes: 60,
    exercises: [{ exercise_id: '', reps: '', weight_kg: '', sets: 3 }],
  })
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [previous, setPrevious] = useState({})
  const [previousWorkoutId, setPreviousWorkoutId] = useState(null)
  const [volumeWeeks, setVolumeWeeks] = useState([])
  const [personalRecords, setPersonalRecords] = useState([])
  const [progressionId, setProgressionId] = useState('')
  const [progression, setProgression] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [addPreviewId, setAddPreviewId] = useState('')
  const workoutMutationQueue = useRef(Promise.resolve())
  const activeWorkout = activeSession || workouts.find((workout) => (
    workout.status === 'in_progress' && workout.source === 'live'
  ))
  const activeWorkoutId = activeWorkout?.id
  const activeExerciseIds = (activeWorkout?.exercises || []).map((item) => item.exercise_id)
  const activeExerciseKey = activeExerciseIds.join(',')
  const previousForWorkout = previousWorkoutId === activeWorkoutId ? previous : {}
  const displayedWorkout = selectedWorkout
    ? workouts.find((workout) => workout.id === selectedWorkout.id) || selectedWorkout
    : null

  const loadData = useCallback(async () => {
    try {
      const [s, w, m, e, p, sessions, volumes, records, active] = await Promise.all([
        api.summary(), api.weekly(), api.muscleGroups(),
        api.exercises(), api.plans(), api.workouts(),
        api.volumeByWeek(), api.personalRecords(), api.activeWorkout(),
      ])
      setSummary(s)
      setWeekly(w)
      setMuscles(m)
      setExercises(e)
      setPlans(p)
      setWorkouts(sessions)
      setActiveSession(active)
      setVolumeWeeks(volumes)
      setPersonalRecords(records)
    } catch (err) {
      setError(err.message || 'Could not connect to RepLog API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { loadData() }, 0)
    return () => window.clearTimeout(initialLoad)
  }, [loadData])

  const filteredExercises = exercises.filter((exercise) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [exercise.name, exercise.muscle_group, exercise.equipment]
      .some((value) => value?.toLowerCase().includes(q))
    return matchesSearch
      && (!muscleFilter || exercise.muscle_group === muscleFilter)
      && (!equipmentFilter || exercise.equipment === equipmentFilter)
  })

  async function runAction(action, successMessage) {
    if (mutating) return false
    setError('')
    setNotice('')
    setMutating(true)
    setLoading(true)
    try {
      await action()
      await loadData()
      setNotice(successMessage)
      return true
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      return false
    } finally {
      setMutating(false)
      setLoading(false)
    }
  }

  async function createExercise(event) {
    event.preventDefault()
    await runAction(async () => {
      await api.createExercise(exerciseDraft)
      setExerciseDraft({ name: '', muscle_group: 'Chest', equipment: 'Dumbbell', instructions: '' })
      setExerciseForm(false)
    }, 'Exercise added to your library.')
  }

  async function startWorkout(plan = null) {
    if (activeWorkout) {
      setPage('workouts')
      setNotice('Resumed your active workout.')
      return
    }
    await runAction(
      () => api.startWorkout(plan?.name || workoutTitle, plan?.id ?? null),
      'Workout started.',
    )
    setPage('workouts')
  }

  const activeWorkouts = workouts.filter((w) => w.status === 'in_progress')
  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at))
    .slice(0, 5)

  async function runWorkoutAction(action, successMessage) {
    const operation = workoutMutationQueue.current.then(async () => {
      setError('')
      setNotice('')
      setMutating(true)
      setLoading(true)
      try {
        const updated = await action()
        if (updated?.status === 'in_progress') {
          setActiveSession(updated)
          setWorkouts((current) => current.map((workout) => (
            workout.id === updated.id ? updated : workout
          )))
        } else {
          await loadData()
        }
        if (successMessage) setNotice(successMessage)
        return updated
      } catch (err) {
        setError(err.message || 'Could not update this workout.')
        return null
      } finally {
        setMutating(false)
        setLoading(false)
      }
    })
    workoutMutationQueue.current = operation.catch((err) => {
      setError(err.message || 'Could not update this workout.')
    })
    return operation
  }

  async function createPlan(event) {
    event.preventDefault()
    const payload = {
      name: planDraft.name,
      description: planDraft.description || null,
      exercises: planDraft.exercise_ids.map((exerciseId, position) => ({
        exercise_id: Number(exerciseId),
        position,
        target_sets: Number(planDraft.target_sets),
        target_reps_min: Number(planDraft.target_reps_min),
        target_reps_max: Number(planDraft.target_reps_max),
        target_weight_kg: planDraft.target_weight_kg === '' ? null : Number(planDraft.target_weight_kg),
      })),
    }
    if (await runAction(() => api.createPlan(payload), 'Training plan created.')) {
      setPlanForm(false)
      setPlanDraft({ name: '', description: '', exercise_ids: [], target_sets: 3, target_reps_min: 8, target_reps_max: 12, target_weight_kg: '' })
    }
  }

  async function addManualWorkout(event) {
    event.preventDefault()
    if (!manualDraft.exercises.length || manualDraft.exercises.some((item) => !item.exercise_id)) {
      setError('Choose an exercise for each historical workout entry.')
      return
    }
    const performedAt = new Date(manualDraft.performed_at)
    const startedAt = new Date(
      performedAt.getTime() - Number(manualDraft.duration_minutes) * 60000,
    )
    const payload = {
      title: manualDraft.title || 'Historical workout',
      source: 'manual',
      performed_at: performedAt.toISOString(),
      started_at: startedAt.toISOString(),
      ended_at: performedAt.toISOString(),
      exercises: manualDraft.exercises.map((exercise, position) => ({
        exercise_id: Number(exercise.exercise_id),
        position,
        sets: Array.from({ length: Number(exercise.sets) }, (_, index) => ({
          set_number: index + 1,
          reps: exercise.reps === '' ? null : Number(exercise.reps),
          weight_kg: exercise.weight_kg === '' ? null : Number(exercise.weight_kg),
          completed: true,
        })),
      })),
    }
    if (await runAction(() => api.createWorkout(payload), 'Historical workout added.')) {
      setManualForm(false)
      setManualDraft({ title: '', performed_at: localDateTime(), duration_minutes: 60, exercises: [{ exercise_id: '', reps: '', weight_kg: '', sets: 3 }] })
    }
  }

  async function editExercise(exercise) {
    if (exercise.user_id == null) return
    const name = window.prompt('Exercise name', exercise.name)
    if (name === null) return
    const muscle_group = window.prompt('Muscle group', exercise.muscle_group)
    if (muscle_group === null) return
    const equipment = window.prompt('Equipment', exercise.equipment)
    if (equipment === null) return
    const instructions = window.prompt('Instructions', exercise.instructions || '')
    if (instructions === null) return
    await runAction(
      () => api.updateExercise(exercise.id, { name, muscle_group, equipment, instructions }),
      'Exercise updated.',
    )
  }

  async function exerciseProgression(id) {
    setProgressionId(String(id))
  }

  useEffect(() => {
    if (!activeWorkoutId) return undefined
    let cancelled = false
    Promise.all(activeExerciseKey.split(',').filter(Boolean).map(async (exerciseId) => {
      try {
        return [Number(exerciseId), await api.previousPerformance(activeWorkoutId, exerciseId)]
      } catch (err) {
        throw new Error(`Could not load previous performance: ${err.message}`)
      }
    })).then((results) => {
      if (!cancelled) {
        setPrevious(Object.fromEntries(results))
        setPreviousWorkoutId(activeWorkoutId)
      }
    }).catch((err) => {
      if (!cancelled) setError(err.message)
    })
    return () => { cancelled = true }
  }, [activeWorkoutId, activeExerciseKey])

  useEffect(() => {
    if (!progressionId) return undefined
    let cancelled = false
    api.exerciseProgression(progressionId).then((data) => {
      if (!cancelled) setProgression(data)
    }).catch((err) => {
      if (!cancelled) setError(err.message || 'Could not load exercise progression.')
    })
    return () => { cancelled = true }
  }, [progressionId])

  function workoutCard(workout) {
    const setCount = workout.exercises?.reduce((total, item) => total + (item.sets?.length || 0), 0) || 0
    return (
      <div className="workout-row" key={workout.id}>
        <div className="workout-mark"><Dumbbell size={19} /></div>
        <div className="workout-info">
          <strong>{workout.title}</strong>
          <span>{formatDate(workout.performed_at)} · {setCount} sets logged</span>
        </div>
        <span className={`status ${workout.status === 'completed' ? 'status-done' : 'status-active'}`}>
          {workout.status === 'completed' ? 'Completed' : workout.status === 'in_progress' ? 'In progress' : 'Cancelled'}
        </span>
        <button className="icon-button" title="View workout details" onClick={() => setSelectedWorkout(workout)}><Search size={16} /></button>
        {workout.status === 'in_progress' && (
          <button
            className="icon-button finish-button"
            title="Resume workout"
            onClick={() => startWorkout()}
          ><Check size={17} /></button>
        )}
      </div>
    )
  }

  function dashboard() {
    const maxWeekly = Math.max(1, ...weekly.map((item) => item.workouts))
    const featuredExercise = exercises.find((exercise) => /squat/i.test(exercise.name || ''))
      || exercises.find((exercise) => /push/i.test(exercise.name || ''))
      || exercises[0]
    return (
      <>
        <section className="welcome">
          <div className="welcome-copy">
            <span className="eyebrow">CONSISTENCY BEATS INTENSITY</span>
            <h2>Show up.<br /><span>Get stronger.</span></h2>
            <p>Log sets in the gym, keep plans tight, and watch the work compound.</p>
            <div className="welcome-action">
              <div>
                <div className="welcome-number">{summary?.completed_workouts ?? '—'}</div>
                <span>completed workouts</span>
              </div>
              <button className="button button-primary" onClick={() => startWorkout()}>
                <Plus size={17} /> Start workout
              </button>
            </div>
            <div className="dashboard-quick-actions">
              <button className="text-button" onClick={() => { setPage('plans'); setPlanForm(true) }}>Create plan <ChevronRight size={14} /></button>
              <button className="text-button" onClick={() => { setPage('history'); setManualForm(true) }}>Add past workout <ChevronRight size={14} /></button>
            </div>
          </div>
          {featuredExercise && (
            <div className="featured-movement">
              <span className="eyebrow">TRAINING FOCUS</span>
              <ExerciseAnimation exercise={featuredExercise} showControls compact={false} />
            </div>
          )}
        </section>

        <section className="stat-strip" aria-label="Training totals">
          <Stat label="Workouts" value={summary?.completed_workouts} icon={Activity} />
          <Stat label="Sets" value={summary?.completed_sets} icon={Target} />
          <Stat label="Reps" value={summary?.completed_reps} icon={ArrowUpRight} />
          <Stat label="Volume" value={Number(summary?.total_volume_kg ?? 0).toLocaleString()} suffix=" kg" icon={BarChart3} />
        </section>

        <div className="content-grid">
          <section className="panel">
            <div className="panel-heading">
              <div><span className="eyebrow">LAST 7 DAYS</span><h3>Weekly activity</h3></div>
              <CalendarDays size={19} />
            </div>
            <div className="weekly-chart">
              {weekly.map((item) => (
                <div className="day-column" key={item.date}>
                  <span className="day-count">{item.workouts || ''}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ height: `${Math.max(item.workouts ? 14 : 3, (item.workouts / maxWeekly) * 100)}%` }} />
                  </div>
                  <span className="day-label">{new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><span className="eyebrow">YOUR ROUTINES</span><h3>Training plans</h3></div>
              <button className="text-button" onClick={() => setPage('plans')}>View all <ChevronRight size={15} /></button>
            </div>
            {plans.length ? plans.slice(0, 4).map((plan) => (
              <button className="plan-row" key={plan.id} onClick={() => startWorkout(plan)}>
                <div><strong>{plan.name}</strong><span>{plan.exercises?.length || 0} exercises</span></div>
                <span className="plan-play"><Plus size={17} /></span>
              </button>
            )) : <p className="muted">No training plans yet.</p>}
          </section>
        </div>

        <section className="panel recent-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">YOUR TRAINING LOG</span><h3>Recent workouts</h3></div>
            <button className="text-button" onClick={() => setPage('history')}>View history <ChevronRight size={15} /></button>
          </div>
          {recentWorkouts.length ? recentWorkouts.map(workoutCard) : (
            <EmptyState title="Your first session starts here" description="Start a workout to begin building your training history." action="Start workout" onAction={() => startWorkout()} />
          )}
        </section>
        {personalRecords.length > 0 && <section className="panel dashboard-records"><div className="panel-heading"><div><span className="eyebrow">RECENT BESTS</span><h3>Personal records</h3></div><button className="text-button" onClick={() => setPage('analytics')}>View analytics <ChevronRight size={14} /></button></div>
          {personalRecords.slice(0, 3).map((record) => <div className="dashboard-record-row" key={record.exercise_id}><strong>{record.exercise}</strong><span>{record.max_weight_kg == null ? '—' : `${record.max_weight_kg} kg`}</span><span>{record.max_reps == null ? '—' : `${record.max_reps} reps`}</span></div>)}
        </section>}
      </>
    )
  }

  function exercisePage() {
    return (
      <>
        <div className="toolbar">
          <label className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercises, muscles, equipment..." /></label>
          <select aria-label="Filter by muscle group" value={muscleFilter} onChange={(event) => setMuscleFilter(event.target.value)}><option value="">All muscle groups</option>{[...new Set(exercises.map((item) => item.muscle_group))].sort().map((group) => <option key={group}>{group}</option>)}</select>
          <select aria-label="Filter by equipment" value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)}><option value="">All equipment</option>{[...new Set(exercises.map((item) => item.equipment))].sort().map((item) => <option key={item}>{item}</option>)}</select>
          <button className="button button-primary" onClick={() => setExerciseForm(!exerciseForm)}>
            {exerciseForm ? <X size={17} /> : <Plus size={17} />} {exerciseForm ? 'Cancel' : 'Add exercise'}
          </button>
        </div>
        {exerciseForm && (
          <form className="panel form-panel" onSubmit={createExercise}>
            <h3>New exercise</h3>
            <div className="form-grid">
              <label>Exercise name<input required value={exerciseDraft.name} onChange={(e) => setExerciseDraft({ ...exerciseDraft, name: e.target.value })} /></label>
              <label>Muscle group<select value={exerciseDraft.muscle_group} onChange={(e) => setExerciseDraft({ ...exerciseDraft, muscle_group: e.target.value })}>{['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body'].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label>Equipment<select value={exerciseDraft.equipment} onChange={(e) => setExerciseDraft({ ...exerciseDraft, equipment: e.target.value })}>{['Dumbbell', 'Barbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Bench', 'None'].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label>Instructions<textarea value={exerciseDraft.instructions} onChange={(e) => setExerciseDraft({ ...exerciseDraft, instructions: e.target.value })} /></label>
            </div>
            <button className="button button-primary" type="submit" disabled={mutating}>Save exercise</button>
          </form>
        )}
        <div className="section-caption">{filteredExercises.length} EXERCISES</div>
        <div className={`exercise-library ${selectedExercise ? '' : 'is-solo'}`}>
          {filteredExercises.length ? <div className="exercise-list">
            {filteredExercises.map((exercise) => (
              <article className={`exercise-row ${selectedExercise?.id === exercise.id ? 'is-selected' : ''}`} key={exercise.id}>
                <button type="button" className="exercise-row-main" onClick={() => setSelectedExercise(exercise)}>
                  <div className="exercise-row-visual">
                    <ExercisePreview exercise={exercise} compact autoplay={selectedExercise?.id === exercise.id} />
                  </div>
                  <div className="exercise-row-copy">
                    <span className="exercise-origin">{exercise.user_id == null ? 'BUILT-IN' : 'CUSTOM'} · #{String(exercise.id).padStart(3, '0')}</span>
                    <h3>{exercise.name}</h3>
                    <div className="tag-row"><span>{exercise.muscle_group}</span><span>{exercise.equipment}</span></div>
                  </div>
                </button>
                <div className="exercise-actions">
                  <button className="text-button" onClick={() => setSelectedExercise(exercise)}>Open demo</button>
                  <button className="text-button" onClick={() => exerciseProgression(exercise.id)}>Progress</button>
                  {exercise.user_id != null && <>
                    <button className="icon-button" aria-label={`Edit ${exercise.name}`} onClick={() => editExercise(exercise)}><Edit2 size={15} /></button>
                    <button className="icon-button danger-icon" aria-label={`Delete ${exercise.name}`} onClick={() => setConfirm({
                      title: `Delete ${exercise.name}?`,
                      description: 'This removes the custom exercise from your library. Existing workout history is left unchanged.',
                      confirmLabel: 'Delete exercise',
                      danger: true,
                      action: () => runAction(() => api.deleteExercise(exercise.id), 'Exercise deleted.'),
                    })}><Trash2 size={15} /></button>
                  </>}
                </div>
              </article>
            ))}
          </div> : <EmptyState title="No matching exercises" description="Try another search or adjust the muscle and equipment filters." />}
          {selectedExercise && <ExerciseDetailPanel exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />}
        </div>
        {progression && <section className="panel progression-panel"><div className="panel-heading"><div><span className="eyebrow">EXERCISE PROGRESSION</span><h3>{progression.exercise}</h3></div><button className="icon-button" aria-label="Close progression" onClick={() => { setProgression(null); setProgressionId('') }}><X size={16} /></button></div>
          {progression.points.length ? <><div className="progression-chart"><ResponsiveContainer width="100%" height={220}><LineChart data={progression.points}><CartesianGrid stroke="#34383b" vertical={false} /><XAxis dataKey="performed_at" tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} stroke="#8d9593" tick={{ fontSize: 10 }} /><YAxis stroke="#8d9593" tick={{ fontSize: 10 }} width={42} /><Tooltip labelFormatter={(value) => formatDate(value)} contentStyle={{ background: '#191c1f', border: '1px solid #34383b' }} /><Line type="monotone" dataKey="weight_kg" name="Weight (kg)" stroke="#b9e769" strokeWidth={2} connectNulls dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
            <div className="progression-list">{progression.points.slice(-8).map((point, index) => <div key={`${point.performed_at}-${index}`}><time>{formatDate(point.performed_at)}</time><span>{point.weight_kg ?? '—'} kg × {point.reps ?? '—'} reps</span><strong>{point.estimated_1rm_kg == null ? '—' : `${point.estimated_1rm_kg} kg e1RM`}</strong></div>)}</div></> : <p className="muted">Complete sets for this exercise to build a progression history.</p>}
          <small>{progression.formula}</small>
        </section>}
      </>
    )
  }

  function plansPage() {
    return (
      <>
        <div className="toolbar"><div className="page-intro"><p>Build reusable routines with target sets, rep ranges, and optional loads.</p></div><button className="button button-primary" onClick={() => setPlanForm((open) => !open)}><Plus size={16} /> {planForm ? 'Cancel' : 'Create plan'}</button></div>
        {planForm && <form className="panel form-panel" onSubmit={createPlan}>
          <h3>New training plan</h3>
          <div className="form-grid">
            <label>Plan name<input required maxLength="150" value={planDraft.name} onChange={(event) => setPlanDraft({ ...planDraft, name: event.target.value })} /></label>
            <label>Description<input value={planDraft.description} onChange={(event) => setPlanDraft({ ...planDraft, description: event.target.value })} /></label>
            <label>Target sets<input type="number" min="1" max="20" value={planDraft.target_sets} onChange={(event) => setPlanDraft({ ...planDraft, target_sets: event.target.value })} /></label>
            <label>Rep range<div className="inline-fields"><input aria-label="Minimum reps" type="number" min="1" max="100" value={planDraft.target_reps_min} onChange={(event) => setPlanDraft({ ...planDraft, target_reps_min: event.target.value })} /><input aria-label="Maximum reps" type="number" min="1" max="100" value={planDraft.target_reps_max} onChange={(event) => setPlanDraft({ ...planDraft, target_reps_max: event.target.value })} /></div></label>
            <label>Target weight (kg, optional)<input type="number" min="0" step="0.5" value={planDraft.target_weight_kg} onChange={(event) => setPlanDraft({ ...planDraft, target_weight_kg: event.target.value })} /></label>
          </div>
          <div className="exercise-choice-list"><strong>Exercises</strong>{exercises.map((exercise) => <label key={exercise.id} className="exercise-choice">
            <input type="checkbox" checked={planDraft.exercise_ids.includes(exercise.id)} onChange={(event) => setPlanDraft({ ...planDraft, exercise_ids: event.target.checked ? [...planDraft.exercise_ids, exercise.id] : planDraft.exercise_ids.filter((id) => id !== exercise.id) })} />
            <span className="exercise-choice-preview"><ExercisePreview exercise={exercise} compact /></span>
            {exercise.name}
          </label>)}</div>
          {planDraft.exercise_ids.length > 0 && (
            <div className="plan-form-preview">
              <ExerciseAnimation
                exercise={exercises.find((exercise) => exercise.id === planDraft.exercise_ids[planDraft.exercise_ids.length - 1])}
                showControls
              />
            </div>
          )}
          <button className="button button-primary" type="submit" disabled={mutating}>Save plan</button>
        </form>}
        {plans.length ? (
          <div className="plan-grid">{plans.map((plan) => (
            <article className="plan-card" key={plan.id}>
              <div className="plan-card-top"><span className="eyebrow">TRAINING PLAN · {String(plan.id).padStart(2, '0')}</span><div className="plan-actions">
                <button className="icon-button" aria-label={`Edit ${plan.name}`} onClick={() => { const name = window.prompt('Plan name', plan.name); if (name != null) runAction(() => api.updatePlan(plan.id, { name }), 'Plan updated.') }}><Edit2 size={15} /></button>
                <button className="icon-button" aria-label={`Duplicate ${plan.name}`} onClick={() => runAction(() => api.createPlan({ name: `Copy of ${plan.name}`, description: plan.description, exercises: plan.exercises.map((item, position) => ({ exercise_id: item.exercise_id, position, target_sets: item.target_sets, target_reps_min: item.target_reps_min, target_reps_max: item.target_reps_max, target_weight_kg: item.target_weight_kg })) }), 'Plan duplicated.')}><Copy size={15} /></button>
                <button className="icon-button danger-icon" aria-label={`Delete ${plan.name}`} onClick={() => setConfirm({
                  title: `Delete ${plan.name}?`,
                  description: 'The routine will be removed. Past workouts started from this plan stay in your history.',
                  confirmLabel: 'Delete plan',
                  danger: true,
                  action: () => runAction(() => api.deletePlan(plan.id), 'Plan deleted.'),
                })}><Trash2 size={15} /></button>
              </div></div>
              <h3>{plan.name}</h3><p>{plan.description || 'A training routine built around your goals.'}</p>
              <div className="plan-meta"><span>{plan.exercises?.length || 0} exercises</span><span>Custom routine</span></div>
              {plan.exercises?.map((item, index) => (
                <div className="plan-exercise" key={item.id}>
                  <div className="plan-exercise-preview"><ExercisePreview exercise={item.exercise} name={item.exercise?.name} compact /></div>
                  <span>{item.exercise?.name || `Exercise #${item.exercise_id}`}</span>
                  <span>{item.target_sets} × {item.target_reps_min}–{item.target_reps_max}{item.target_weight_kg != null ? ` · ${item.target_weight_kg} kg` : ''}</span>
                  <button className="icon-button" title="Move up" disabled={index === 0} onClick={() => runAction(() => api.updatePlanExercise(plan.id, item.id, { exercise_id: item.exercise_id, position: index - 1, target_sets: item.target_sets, target_reps_min: item.target_reps_min, target_reps_max: item.target_reps_max, target_weight_kg: item.target_weight_kg }), 'Plan order updated.')}><ArrowUp size={14} /></button>
                  <button className="icon-button" title="Move down" disabled={index === plan.exercises.length - 1} onClick={() => runAction(() => api.updatePlanExercise(plan.id, item.id, { exercise_id: item.exercise_id, position: index + 1, target_sets: item.target_sets, target_reps_min: item.target_reps_min, target_reps_max: item.target_reps_max, target_weight_kg: item.target_weight_kg }), 'Plan order updated.')}><ArrowDown size={14} /></button>
                  <button className="icon-button" title="Edit targets" onClick={() => {
                    const target_sets = Number(window.prompt('Target sets', item.target_sets))
                    if (!target_sets) return
                    const target_reps_min = Number(window.prompt('Minimum reps', item.target_reps_min))
                    if (!target_reps_min) return
                    const target_reps_max = Number(window.prompt('Maximum reps', item.target_reps_max))
                    if (!target_reps_max) return
                    const targetWeight = window.prompt('Target weight in kg (leave blank for none)', item.target_weight_kg ?? '')
                    if (targetWeight === null) return
                    runAction(() => api.updatePlanExercise(plan.id, item.id, { exercise_id: item.exercise_id, position: index, target_sets, target_reps_min, target_reps_max, target_weight_kg: targetWeight.trim() ? Number(targetWeight) : null }), 'Plan targets updated.')
                  }}><Edit2 size={14} /></button>
                  <button className="icon-button danger-icon" title="Remove exercise" onClick={() => setConfirm({
                    title: 'Remove from plan?',
                    description: `${item.exercise?.name || 'This exercise'} will be taken off the routine. Past workouts are not changed.`,
                    confirmLabel: 'Remove',
                    danger: true,
                    action: () => runAction(() => api.deletePlanExercise(plan.id, item.id), 'Exercise removed from plan.'),
                  })}><X size={14} /></button>
                </div>
              ))}
              <details className="plan-add-exercise"><summary>Add exercise / edit targets</summary>
                <form className="form-grid compact-form" onSubmit={async (event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  const form = event.currentTarget
                  const saved = await runAction(() => api.addPlanExercise(plan.id, {
                    exercise_id: Number(data.get('exercise_id')),
                    position: plan.exercises.length,
                    target_sets: Number(data.get('target_sets')),
                    target_reps_min: Number(data.get('target_reps_min')),
                    target_reps_max: Number(data.get('target_reps_max')),
                    target_weight_kg: data.get('target_weight_kg') === '' ? null : Number(data.get('target_weight_kg')),
                  }), 'Exercise added to plan.')
                  if (saved) form.reset()
                }}>
                  <label>Exercise<select name="exercise_id" required onChange={(event) => setAddPreviewId(event.target.value)}><option value="">Select</option>{exercises.filter((exercise) => !plan.exercises.some((item) => item.exercise_id === exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>
                  <label>Sets<input name="target_sets" type="number" min="1" max="20" defaultValue="3" required /></label>
                  <label>Min reps<input name="target_reps_min" type="number" min="1" max="100" defaultValue="8" required /></label>
                  <label>Max reps<input name="target_reps_max" type="number" min="1" max="100" defaultValue="12" required /></label>
                  <label>Target kg<input name="target_weight_kg" type="number" min="0" step="0.5" /></label>
                  <button className="button button-primary" type="submit" disabled={mutating}>Add target</button>
                </form>
                {addPreviewId && (
                  <div className="plan-form-preview">
                    <ExerciseAnimation exercise={exercises.find((exercise) => String(exercise.id) === String(addPreviewId))} showControls />
                  </div>
                )}
              </details>
              <button className="button button-primary button-wide" onClick={() => startWorkout(plan)}><Plus size={17} /> Start this plan</button>
            </article>
          ))}</div>
        ) : <EmptyState title="No plans yet" description="Create a plan to save a reusable training routine." action="Create a plan" onAction={() => setPlanForm(true)} />}
      </>
    )
  }

  function workoutsPage() {
    return (
      <>
        {activeWorkout ? <LiveWorkout
          workout={activeWorkout}
          exercises={exercises}
          previous={previousForWorkout}
          busy={loading || mutating}
          onAddExercise={(exercise_id) => runWorkoutAction(() => api.addWorkoutExercise(activeWorkout.id, { exercise_id, position: activeWorkout.exercises.length, sets: [] }), 'Exercise added to active workout.')}
          onUpdateSet={(setId, changes) => runWorkoutAction(() => api.updateWorkoutSet(activeWorkout.id, setId, changes), '')}
          onAddSet={(exerciseId, data) => runWorkoutAction(() => api.addWorkoutSet(activeWorkout.id, exerciseId, data || {}), 'Set added.')}
          onRemoveSet={(setId) => setConfirm({
            title: 'Remove this set?',
            description: 'The set will be deleted from the current exercise.',
            confirmLabel: 'Remove set',
            danger: true,
            action: () => runWorkoutAction(() => api.removeWorkoutSet(activeWorkout.id, setId), 'Set removed.'),
          })}
          onRemoveExercise={(exerciseId) => setConfirm({
            title: 'Remove this exercise?',
            description: 'Its sets will be deleted from the current session. Other exercises stay in place.',
            confirmLabel: 'Remove exercise',
            danger: true,
            action: () => runWorkoutAction(() => api.removeWorkoutExercise(activeWorkout.id, exerciseId), 'Exercise removed.'),
          })}
          onMoveExercise={(exerciseId, position) => runWorkoutAction(() => api.moveWorkoutExercise(activeWorkout.id, exerciseId, position), 'Exercise order updated.')}
          onFinish={() => setConfirm({
            title: 'Finish this workout?',
            description: 'The session will be saved as completed. You can still review it from history.',
            confirmLabel: 'Finish workout',
            action: () => runWorkoutAction(() => api.finishWorkout(activeWorkout.id), 'Workout completed.'),
          })}
        /> : <section className="panel start-panel">
          <div><span className="eyebrow">READY WHEN YOU ARE</span><h3>Start a session</h3><p>Begin an empty workout or choose one of your saved routines.</p></div>
          <div className="start-controls">
            <input value={workoutTitle} onChange={(e) => setWorkoutTitle(e.target.value)} aria-label="Workout title" placeholder="Workout title" />
            <button className="button button-primary" disabled={mutating} onClick={() => startWorkout()}><Plus size={17} /> Start empty workout</button>
          </div>
        </section>}
        {activeWorkout && activeWorkouts.length > 1 && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">OTHER UNFINISHED SESSIONS</span><h3>Review older sessions</h3></div><History size={18} /></div>
          <p className="muted">Only one live session can be active at a time. Cancel a stale session here to keep the active workout clean.</p>
          {activeWorkouts.filter((workout) => workout.id !== activeWorkout.id).map((workout) => <div className="workout-row" key={workout.id}><div className="workout-info"><strong>{workout.title}</strong><span>Started {formatDate(workout.started_at)}</span></div><button className="button" disabled={mutating} onClick={() => setConfirm({
            title: `Cancel ${workout.title}?`,
            description: 'This unfinished session will be marked cancelled and will no longer appear as active.',
            confirmLabel: 'Cancel session',
            danger: true,
            action: () => runAction(() => api.updateWorkout(workout.id, { status: 'cancelled' }), 'Unfinished workout cancelled.'),
          })}>Cancel unfinished</button></div>)}
        </section>}
        {!activeWorkout && plans.length > 0 && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">SAVED ROUTINES</span><h3>Start from a plan</h3></div><CalendarDays size={18} /></div><div className="quick-plan-list">{plans.map((plan) => <button className="plan-row" key={plan.id} onClick={() => startWorkout(plan)}><div><strong>{plan.name}</strong><span>{plan.exercises.length} exercises</span></div><span className="plan-play"><Plus size={17} /></span></button>)}</div></section>}
        {activeWorkouts.length > 0 && !activeWorkout && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">UNFINISHED</span><h3>Resume your session</h3></div><Activity size={18} /></div>{activeWorkouts.map(workoutCard)}</section>}
        {!activeWorkout && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">ALL SESSIONS</span><h3>Workout log</h3></div><span className="count-badge">{workouts.length}</span></div>
          {workouts.length ? workouts.map(workoutCard) : <EmptyState title="No sessions yet" description="Start a workout to record your first session." />}
        </section>}
      </>
    )
  }

  function historyPage() {
    const completedWorkouts = workouts.filter((workout) => workout.status === 'completed')
    return (
      <>
      <div className="toolbar"><p className="muted">Completed live and historical sessions are listed here.</p><button className="button button-primary" onClick={() => setManualForm((visible) => !visible)}><Plus size={16} /> Add historical workout</button></div>
      {manualForm && <form className="panel form-panel" onSubmit={addManualWorkout}>
        <h3>Enter a past workout</h3>
        <div className="form-grid">
          <label>Workout title<input value={manualDraft.title} onChange={(event) => setManualDraft({ ...manualDraft, title: event.target.value })} placeholder="Historical workout" /></label>
          <label>Date and time<input type="datetime-local" required value={manualDraft.performed_at} onChange={(event) => setManualDraft({ ...manualDraft, performed_at: event.target.value })} /></label>
          <label>Duration (minutes)<input type="number" min="0" max="1440" value={manualDraft.duration_minutes} onChange={(event) => setManualDraft({ ...manualDraft, duration_minutes: event.target.value })} /></label>
        </div>
        {manualDraft.exercises.map((entry, index) => <div className="manual-exercise-row" key={index}>
          <label>Exercise<select required value={entry.exercise_id} onChange={(event) => setManualDraft({ ...manualDraft, exercises: manualDraft.exercises.map((item, i) => i === index ? { ...item, exercise_id: event.target.value } : item) })}><option value="">Choose exercise</option>{exercises.filter((exercise) => String(exercise.id) === entry.exercise_id || !manualDraft.exercises.some((other, i) => i !== index && Number(other.exercise_id) === exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>
          <label>Sets<input type="number" min="1" max="100" value={entry.sets} onChange={(event) => setManualDraft({ ...manualDraft, exercises: manualDraft.exercises.map((item, i) => i === index ? { ...item, sets: event.target.value } : item) })} /></label>
          <label>Weight (kg)<input type="number" min="0" step="0.5" value={entry.weight_kg} onChange={(event) => setManualDraft({ ...manualDraft, exercises: manualDraft.exercises.map((item, i) => i === index ? { ...item, weight_kg: event.target.value } : item) })} /></label>
          <label>Repetitions<input type="number" min="0" value={entry.reps} onChange={(event) => setManualDraft({ ...manualDraft, exercises: manualDraft.exercises.map((item, i) => i === index ? { ...item, reps: event.target.value } : item) })} /></label>
          {manualDraft.exercises.length > 1 && <button className="icon-button danger-icon" type="button" aria-label="Remove exercise" onClick={() => setManualDraft({ ...manualDraft, exercises: manualDraft.exercises.filter((_, i) => i !== index) })}><Trash2 size={15} /></button>}
        </div>)}
        <button className="text-button manual-add-row" type="button" onClick={() => setManualDraft({ ...manualDraft, exercises: [...manualDraft.exercises, { exercise_id: '', reps: '', weight_kg: '', sets: 3 }] })}><Plus size={15} /> Add another exercise</button>
        <button className="button button-primary" type="submit" disabled={mutating}>Save historical workout</button>
      </form>}
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">YOUR RECORD</span><h3>Workout history</h3></div><History size={19} /></div>
        {completedWorkouts.length ? completedWorkouts.map((workout) => {
          const completedSets = workout.exercises?.flatMap((exercise) => exercise.sets || []).filter((set) => set.completed) || []
          const volume = completedSets.reduce((total, set) => total + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)
          return (
        <div className="history-row" key={workout.id}>
          <div className="history-date"><span>{new Date(workout.performed_at).toLocaleDateString(undefined, { day: '2-digit' })}</span><small>{new Date(workout.performed_at).toLocaleDateString(undefined, { month: 'short' })}</small></div>
          <div className="workout-info"><strong>{workout.title}</strong><span>{formatDate(workout.performed_at)} · {workout.exercises?.length || 0} exercises · {completedSets.length} sets · {Math.round(volume).toLocaleString()} kg volume</span></div>
            <div className="history-duration"><Clock3 size={15} /> {formatDuration(workout.started_at, workout.ended_at)}</div>
            <span className={`status ${workout.source === 'manual' ? 'status-manual' : 'status-done'}`}>{workout.source === 'manual' ? 'Manual' : 'Live'}</span>
            <button className="icon-button" aria-label={`Inspect ${workout.title}`} onClick={() => setSelectedWorkout(workout)}><Search size={16} /></button>
            <button className="icon-button" aria-label={`Edit ${workout.title}`} onClick={() => {
              const title = window.prompt('Workout title', workout.title)
              if (title === null) return
              const date = window.prompt('Date and time (ISO format)', new Date(workout.performed_at).toISOString())
              if (date === null) return
              runAction(() => api.updateWorkout(workout.id, { title, performed_at: date }), 'Workout updated.')
            }}><Edit2 size={15} /></button>
            <button className="icon-button danger-icon" aria-label={`Delete ${workout.title}`} onClick={() => setConfirm({
              title: `Delete ${workout.title}?`,
              description: 'This session and its logged sets will be removed from history.',
              confirmLabel: 'Delete workout',
              danger: true,
              action: () => runAction(() => api.deleteWorkout(workout.id), 'Workout deleted.'),
            })}><Trash2 size={15} /></button>
          </div>
          )
          }) : <EmptyState title="Nothing logged yet" description="Finish a live workout or add a historical session to begin your record." action="Add historical workout" onAction={() => setManualForm(true)} />}
      </section>
      </>
    )
  }

  function analyticsPage() {
    return (
      <>
        <section className="stats-grid">
          <Stat label="Completed workouts" value={summary?.completed_workouts} icon={Activity} />
          <Stat label="Completed sets" value={summary?.completed_sets} icon={Target} />
          <Stat label="Total reps" value={summary?.completed_reps} icon={ArrowUpRight} />
          <Stat label="Training volume" value={Number(summary?.total_volume_kg ?? 0).toLocaleString()} suffix=" kg" icon={BarChart3} />
        </section>
        <div className="content-grid">
          <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CONSISTENCY</span><h3>Weekly activity</h3></div><CalendarDays size={19} /></div>
            <div className="weekly-chart">{weekly.map((item) => {
              const max = Math.max(1, ...weekly.map((entry) => entry.workouts))
              return <div className="day-column" key={item.date}><span className="day-count">{item.workouts || ''}</span><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(item.workouts ? 14 : 3, item.workouts / max * 100)}%` }} /></div><span className="day-label">{new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span></div>
            })}</div>
          </section>
          <section className="panel"><div className="panel-heading"><div><span className="eyebrow">TRAINING DISTRIBUTION</span><h3>Muscle groups</h3></div><Target size={19} /></div>
            {muscles.length ? muscles.map((muscle) => <div className="muscle-row" key={muscle.muscle_group}><span>{muscle.muscle_group}</span><strong>{muscle.completed_sets} sets</strong></div>) : <p className="muted">Complete sets in your workouts to see muscle-group data here.</p>}
          </section>
          <section className="panel"><div className="panel-heading"><div><span className="eyebrow">WORKLOAD</span><h3>Training volume by week</h3></div><BarChart3 size={19} /></div>
            {volumeWeeks.length ? <div className="volume-chart">{volumeWeeks.map((week) => {
              const max = Math.max(1, ...volumeWeeks.map((item) => item.volume_kg))
              return <div className="volume-week" key={week.week} title={`${week.week}: ${Math.round(week.volume_kg).toLocaleString()} kg`}><span>{week.volume_kg ? Math.round(week.volume_kg / 1000 * 10) / 10 : '0'}</span><div className="bar-track"><div className="bar-fill" style={{ height: `${week.volume_kg ? Math.max(5, week.volume_kg / max * 100) : 2}%` }} /></div><small>{new Date(`${week.week}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>
            })}</div> : <p className="muted">Completed weighted sets will appear here. Volume = completed set kg × reps.</p>}
          </section>
        </div>
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PERSONAL RECORDS</span><h3>Best lifts and rep sets</h3></div><Target size={18} /></div>
          {personalRecords.length ? <div className="record-list">{personalRecords.slice(0, 8).map((record) => <div className="record-row" key={record.exercise_id}><strong>{record.exercise}</strong><span>Max load <b>{record.max_weight_kg == null ? '—' : `${record.max_weight_kg} kg`}</b></span><span>Max reps <b>{record.max_reps ?? '—'}</b></span><span>Epley e1RM <b>{record.estimated_1rm_kg == null ? '—' : `${record.estimated_1rm_kg} kg`}</b></span></div>)}</div> : <p className="muted">Complete a weighted set to establish a personal record.</p>}
          <small>Estimated one-rep max uses the Epley formula: weight × (1 + reps / 30). It is an estimate, not a tested max.</small>
        </section>
      </>
    )
  }

  const renderPage = {
    dashboard,
    exercises: exercisePage,
    plans: plansPage,
    workouts: workoutsPage,
    history: historyPage,
    analytics: analyticsPage,
  }[page]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage('dashboard')} aria-label="RepLog home">
          <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
          <span>rep<span>log</span><small>TRAINING JOURNAL</small></span>
        </button>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'nav-active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {page === id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><div className="connection-dot" /><span>LOCAL DATABASE</span><span className="sidebar-version">v2.0</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">REPLOG <span>/</span> {TITLES[page][1].toUpperCase()}</div>
          <div className="topbar-right"><span className="local-label"><span /> LOCAL MODE</span><button className="icon-button" onClick={() => { setError(''); setLoading(true); loadData() }} title="Refresh data"><LoaderCircle size={17} className={loading ? 'spin' : ''} /></button></div>
        </header>

        <div className="page-content page-enter" key={page}>
          <div className="page-title-row">
            <div><span className="eyebrow">{TITLES[page][0]}</span><h1>{TITLES[page][1]}</h1></div>
            <div className="page-date">{TODAY_LABEL}</div>
          </div>

          {error && <div className="alert alert-error" role="alert"><X size={17} /><span>{error}</span><button className="text-button" onClick={() => { setError(''); setLoading(true); loadData() }}>Retry</button><button aria-label="Dismiss error" onClick={() => setError('')}><X size={15} /></button></div>}
          {notice && <div className="alert alert-success"><Check size={17} /><span>{notice}</span><button onClick={() => setNotice('')}><X size={15} /></button></div>}

          {loading && !summary ? <div className="loading-state"><LoaderCircle className="spin" size={24} /><span>Connecting to RepLog…</span></div> : renderPage()}
        </div>
        <footer className="footer"><span>REPLOG / TRAINING JOURNAL</span><span>BUILT FOR CONSISTENCY</span></footer>
      </main>

      {displayedWorkout && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedWorkout(null) }}>
        <section className="workout-detail-modal" role="dialog" aria-modal="true" aria-labelledby="workout-detail-title">
          <div className="panel-heading">
            <div><span className="eyebrow">{displayedWorkout.source === 'manual' ? 'MANUAL ENTRY' : 'LIVE SESSION'}</span><h2 id="workout-detail-title">{displayedWorkout.title}</h2><p>{formatDate(displayedWorkout.performed_at)} · {formatDuration(displayedWorkout.started_at, displayedWorkout.ended_at)}</p></div>
            <button className="icon-button" aria-label="Close workout details" onClick={() => setSelectedWorkout(null)}><X size={17} /></button>
          </div>
          {displayedWorkout.exercises.length ? displayedWorkout.exercises.map((item) => <div className="detail-exercise" key={item.id}>
            <h3>{item.exercise?.name || `Exercise ${item.exercise_id}`}</h3><span>{item.exercise?.muscle_group || ''}</span>
            <div className="detail-sets">{item.sets.length ? item.sets.map((set) => <div className="detail-set" key={set.id}><span>Set {set.set_number}: {set.weight_kg ?? '—'} kg × {set.reps ?? '—'} reps {set.completed ? '· complete' : '· incomplete'}</span>{displayedWorkout.status !== 'cancelled' && <button className="text-button" disabled={mutating} onClick={() => {
              const weight = window.prompt('Weight in kg (blank for none)', set.weight_kg ?? '')
              if (weight === null) return
              const reps = window.prompt('Repetitions (blank for none)', set.reps ?? '')
              if (reps === null) return
              runAction(() => api.updateWorkoutSet(displayedWorkout.id, set.id, { weight_kg: weight.trim() ? Number(weight) : null, reps: reps.trim() ? Number(reps) : null }), 'Workout set updated.')
            }}>Edit set</button>}</div>) : <span>No sets recorded</span>}</div>
          </div>) : <EmptyState title="No exercises recorded" description="This session has no exercise details." />}
          <button className="button button-primary" onClick={() => setSelectedWorkout(null)}>Close details</button>
        </section>
      </div>}

      <nav className="mobile-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={page === id ? 'mobile-active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>
            <Icon size={19} />
            <span>{label === 'Training plans' ? 'Plans' : label === 'Exercise library' ? 'Exercises' : label === 'Overview' ? 'Home' : label}</span>
          </button>
        ))}
      </nav>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const next = confirm?.action
          setConfirm(null)
          next?.()
        }}
      />
    </div>
  )
}

export default App
