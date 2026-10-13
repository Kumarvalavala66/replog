const API_BASE = 'http://127.0.0.1:8000'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${response.status})`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  summary: () => apiRequest('/analytics/summary'),
  weekly: () => apiRequest('/analytics/weekly'),
  muscleGroups: () => apiRequest('/analytics/muscle-groups'),
  volumeByWeek: () => apiRequest('/analytics/volume-by-week'),
  personalRecords: () => apiRequest('/analytics/personal-records'),
  exerciseProgression: (id) => apiRequest(`/analytics/exercise-progression/${id}`),
  exercises: (search = '', muscleGroup = '', equipment = '') => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (muscleGroup) params.set('muscle_group', muscleGroup)
    if (equipment) params.set('equipment', equipment)
    return apiRequest(`/exercises${params.size ? `?${params}` : ''}`)
  },
  createExercise: (data) =>
    apiRequest('/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateExercise: (id, data) =>
    apiRequest(`/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteExercise: (id) => apiRequest(`/exercises/${id}`, { method: 'DELETE' }),
  plans: () => apiRequest('/plans'),
  createPlan: (data) =>
    apiRequest('/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id, data) =>
    apiRequest(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlan: (id) => apiRequest(`/plans/${id}`, { method: 'DELETE' }),
  addPlanExercise: (id, data) =>
    apiRequest(`/plans/${id}/exercises`, { method: 'POST', body: JSON.stringify(data) }),
  updatePlanExercise: (id, itemId, data) =>
    apiRequest(`/plans/${id}/exercises/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlanExercise: (id, itemId) =>
    apiRequest(`/plans/${id}/exercises/${itemId}`, { method: 'DELETE' }),
  workouts: () => apiRequest('/workouts'),
  activeWorkout: () => apiRequest('/workouts/active'),
  workout: (id) => apiRequest(`/workouts/${id}`),
  previousPerformance: (sessionId, exerciseId) =>
    apiRequest(`/workouts/${sessionId}/exercises/${exerciseId}/previous`),
  createWorkout: (data) =>
    apiRequest('/workouts', { method: 'POST', body: JSON.stringify(data) }),
  startWorkout: (title, planId = null) =>
    apiRequest('/workouts', {
      method: 'POST',
      body: JSON.stringify({
        title,
        source: 'live',
        plan_id: planId,
      }),
    }),
  finishWorkout: (id) =>
    apiRequest(`/workouts/${id}/finish`, { method: 'POST' }),
  addWorkoutExercise: (id, data) =>
    apiRequest(`/workouts/${id}/exercises`, { method: 'POST', body: JSON.stringify(data) }),
  moveWorkoutExercise: (id, exerciseId, position) =>
    apiRequest(`/workouts/${id}/exercises/${exerciseId}/position`, {
      method: 'PATCH', body: JSON.stringify({ position }),
    }),
  removeWorkoutExercise: (id, exerciseId) =>
    apiRequest(`/workouts/${id}/exercises/${exerciseId}`, { method: 'DELETE' }),
  addWorkoutSet: (id, exerciseId, data = {}) =>
    apiRequest(`/workouts/${id}/exercises/${exerciseId}/sets`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateWorkoutSet: (id, setId, data) =>
    apiRequest(`/workouts/${id}/sets/${setId}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  removeWorkoutSet: (id, setId) =>
    apiRequest(`/workouts/${id}/sets/${setId}`, { method: 'DELETE' }),
  updateWorkout: (id, data) =>
    apiRequest(`/workouts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWorkout: (id) => apiRequest(`/workouts/${id}`, { method: 'DELETE' }),
}
