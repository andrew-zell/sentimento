const API_BASE = '/api'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: number; email: string; name: string; role: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ user: { id: number; email: string; name: string; role: string } }>('/auth/me'),
  },
  
  // Users
  users: {
    list: () => request<{ users: any[] }>('/users'),
    create: (data: { email: string; password: string; name: string; role: string }) =>
      request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ email: string; name: string; role: string }>) =>
      request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),
  },
  
  // Briefing Centers
  centers: {
    list: () => request<{ centers: any[] }>('/briefing-centers'),
  },
  
  // Tour Types
  tourTypes: {
    list: () => request<{ tourTypes: any[] }>('/tour-types'),
  },
  
  // Questionnaires
  questionnaires: {
    list: () => request<{ questionnaires: any[] }>('/questionnaires'),
    get: (id: number) => request<{ questionnaire: any }>(`/questionnaires/${id}`),
    create: (data: any) =>
      request('/questionnaires', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request(`/questionnaires/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/questionnaires/${id}`, { method: 'DELETE' }),
  },
  
  // Surveys
  surveys: {
    list: () => request<{ surveys: any[] }>('/surveys'),
    get: (id: number) => request<{ survey: any }>(`/surveys/${id}`),
    getByRoute: (centerCode: string, tourType: string) =>
      request<{ survey: any }>(`/surveys/route/${centerCode}/${tourType}`),
    create: (data: any) =>
      request('/surveys', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request(`/surveys/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/surveys/${id}`, { method: 'DELETE' }),
  },
  
  // Responses
  responses: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<{ responses: any[]; total: number }>(`/responses${query}`)
    },
    get: (id: number) => request<{ response: any }>(`/responses/${id}`),
    submit: (data: any) =>
      request('/responses', { method: 'POST', body: JSON.stringify(data) }),
    createRespondent: (data: { name: string; company: string; position?: string; tourDate: string; briefingCenterId: number }) =>
      request<{ respondent: { id: number; name: string; company: string } }>('/responses/respondent', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    archive: (ids: number[]) =>
      request('/responses/archive', { method: 'POST', body: JSON.stringify({ ids }) }),
    restore: (ids: number[]) =>
      request('/responses/restore', { method: 'POST', body: JSON.stringify({ ids }) }),
  },
  
  // Analytics
  analytics: {
    aggregate: (params: Record<string, string>) => {
      const query = new URLSearchParams(params).toString()
      return request<{ data: any[] }>(`/analytics/aggregate?${query}`)
    },
    summary: () => request<{ summary: any }>('/analytics/summary'),
  },
  
  // Tours (Host-led sessions)
  tours: {
    create: (surveyId: number) =>
      request<{ session: any }>('/tours/create', { method: 'POST', body: JSON.stringify({ surveyId }) }),
    getActiveSession: (surveyId: number) =>
      request<{ session: any | null }>(`/tours/survey/${surveyId}/active`),
    getStatus: (hostCode: string) =>
      request<{ session: any }>(`/tours/${hostCode}/status`),
    join: (hostCode: string, respondentId: number) =>
      request<{ participant: any }>(`/tours/${hostCode}/join`, { 
        method: 'POST', 
        body: JSON.stringify({ respondentId }) 
      }),
    start: (hostCode: string) =>
      request<{ session: any }>(`/tours/${hostCode}/start`, { method: 'POST' }),
    advance: (hostCode: string) =>
      request<{ session: any; hostLedComplete: boolean; currentQuestionIndex?: number; totalHostLedQuestions?: number }>(`/tours/${hostCode}/advance`, { method: 'POST' }),
    updateProgress: (hostCode: string, participantId: string, questionId: number, completed?: boolean) =>
      request<{ participant: any }>(`/tours/${hostCode}/progress`, { 
        method: 'POST', 
        body: JSON.stringify({ participantId, questionId, completed }) 
      }),
    getParticipants: (hostCode: string) =>
      request<{ participants: any[] }>(`/tours/${hostCode}/participants`),
    end: (hostCode: string) =>
      request<{ session: any }>(`/tours/${hostCode}/end`, { method: 'POST' }),
  },
}

