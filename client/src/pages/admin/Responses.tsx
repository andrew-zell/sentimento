import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { format } from 'date-fns'
import { BarChart2, Archive, RotateCcw, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function sentimentColor(pct: number): string {
  if (pct >= 80) return '#C3D790'
  if (pct >= 50) return '#facc15'
  return '#f87171'
}

function isEmojiValue(str: string): boolean {
  const trimmed = str.trim()
  return trimmed.length <= 4 && /\p{Extended_Pictographic}/u.test(trimmed)
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function AnswerValue({ answer, rightAlign = false }: { answer: any; rightAlign?: boolean }) {
  let value = answer.value
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { /* keep as string */ }
  }

  // Array → tag chips
  if (Array.isArray(value)) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${rightAlign ? 'justify-end' : ''}`}>
        {value.map((v: any, i: number) => (
          <span
            key={i}
            className="px-2.5 py-1 rounded-full text-sm font-medium text-text-primary"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            {String(v)}
          </span>
        ))}
      </div>
    )
  }

  if (typeof value === 'object' && value !== null) {
    return <span className="text-base font-semibold text-text-primary">{JSON.stringify(value)}</span>
  }

  const str = String(value)

  // Emoji → large display
  if (isEmojiValue(str)) {
    return <span className="text-3xl leading-none inline-block">{str}</span>
  }

  // Plain text
  return (
    <span className={`text-base font-semibold text-text-primary ${rightAlign ? 'text-right' : ''}`}>
      {str}
    </span>
  )
}

function ScoreBar({ pct }: { pct: number }) {
  const color = sentimentColor(pct)
  return (
    <div className="mt-2.5 flex items-center gap-2.5">
      <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold w-8 text-right shrink-0" style={{ color }}>{pct}%</span>
    </div>
  )
}

function AnswerCard({ answer, index }: { answer: any; index: number }) {
  const questionText = answer.question?.text || `Question ${index + 1}`
  const sentimentPct = answer.sentimentScore != null
    ? Math.round(answer.sentimentScore * 100)
    : null

  return (
    <div
      className="rounded-lg px-4 py-3.5 mb-3 flex items-center gap-6 min-h-[56px]"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {/* Question — left column */}
      <p className="flex-1 text-base font-medium text-text-muted leading-snug min-w-0">
        {questionText}
      </p>

      {/* Answer — right column */}
      <div className="shrink-0 max-w-[45%] flex flex-col items-end gap-1">
        <AnswerValue answer={answer} rightAlign />
        {sentimentPct != null && (
          <span
            className="text-xs font-semibold"
            style={{ color: sentimentColor(sentimentPct) }}
          >
            {sentimentPct}%
          </span>
        )}
      </div>
    </div>
  )
}

type SortField = 'name' | 'company' | 'survey' | 'center' | 'tourDate' | 'completedAt'
type SortDirection = 'asc' | 'desc'

export default function Responses() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    briefing_center: '',
    tour_type: '',
    date_from: '',
    date_to: '',
    company: '',
    archived: 'false',
  })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [sortField, setSortField] = useState<SortField>('completedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedResponse, setSelectedResponse] = useState<any>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: api.centers.list,
  })

  const { data: tourTypesData } = useQuery({
    queryKey: ['tour-types'],
    queryFn: api.tourTypes.list,
  })

  const { data: allResponsesData } = useQuery({
    queryKey: ['responses-all', filters.archived],
    queryFn: () => api.responses.list({ archived: filters.archived, limit: '1000' }),
  })

  const uniqueCompanies = useMemo(() => {
    if (!allResponsesData?.responses) return []
    const companies = new Set(allResponsesData.responses.map((r: any) => r.respondent?.company).filter(Boolean))
    return Array.from(companies).sort() as string[]
  }, [allResponsesData?.responses])

  const filteredResponses = useMemo(() => {
    if (!allResponsesData?.responses) return []
    return allResponsesData.responses.filter((r: any) => {
      if (filters.briefing_center && r.survey?.briefingCenter?.code !== filters.briefing_center) return false
      if (filters.tour_type && r.survey?.tourType?.slug !== filters.tour_type) return false
      if (filters.company && r.respondent?.company !== filters.company) return false
      if (filters.date_from) {
        const completedAt = new Date(r.completedAt)
        const fromDate = new Date(filters.date_from)
        if (completedAt < fromDate) return false
      }
      if (filters.date_to) {
        const completedAt = new Date(r.completedAt)
        const toDate = new Date(filters.date_to)
        toDate.setHours(23, 59, 59, 999)
        if (completedAt > toDate) return false
      }
      return true
    })
  }, [allResponsesData?.responses, filters])

  const archiveMutation = useMutation({
    mutationFn: api.responses.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] })
      setSelectedIds([])
    },
  })

  const restoreMutation = useMutation({
    mutationFn: api.responses.restore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] })
      setSelectedIds([])
    },
  })

  const sortedResponses = useMemo(() => {
    return [...filteredResponses].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case 'name': aVal = a.respondent?.name?.toLowerCase() || ''; bVal = b.respondent?.name?.toLowerCase() || ''; break
        case 'company': aVal = a.respondent?.company?.toLowerCase() || ''; bVal = b.respondent?.company?.toLowerCase() || ''; break
        case 'survey': aVal = a.survey?.title?.toLowerCase() || ''; bVal = b.survey?.title?.toLowerCase() || ''; break
        case 'center': aVal = a.survey?.briefingCenter?.code || ''; bVal = b.survey?.briefingCenter?.code || ''; break
        case 'tourDate': aVal = new Date(a.respondent?.tourDate || 0).getTime(); bVal = new Date(b.respondent?.tourDate || 0).getTime(); break
        case 'completedAt': aVal = new Date(a.completedAt).getTime(); bVal = new Date(b.completedAt).getTime(); break
        default: return 0
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredResponses, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedResponses.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(sortedResponses.map((r: any) => r.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const clearFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const activeFilters = Object.entries(filters).filter(([key, value]) => value !== '' && key !== 'archived')

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field
    const Icon = isActive ? (sortDirection === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
    return (
      <th
        className="text-left px-4 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary select-none transition-colors duration-100"
        onClick={() => toggleSort(field)}
      >
        <div className="flex items-center gap-1.5">
          {children}
          <Icon size={13} className={isActive ? 'text-forest-accent' : 'text-text-muted'} />
        </div>
      </th>
    )
  }

  const selectedResponses = useMemo(() => {
    return sortedResponses.filter((r: any) => selectedIds.includes(r.id))
  }, [sortedResponses, selectedIds])

  const isLoading = !allResponsesData

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-header mb-0">Responses</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <>
              <button
                onClick={() => setShowAnalytics(true)}
                className="btn-primary !py-2 !px-4 flex items-center gap-2 text-sm"
              >
                <BarChart2 size={15} />
                Analytics ({selectedIds.length})
              </button>
              {filters.archived === 'false' ? (
                <button
                  onClick={() => archiveMutation.mutate(selectedIds)}
                  className="btn-secondary !py-2 !px-4 flex items-center gap-2 text-sm"
                >
                  <Archive size={15} />
                  Archive ({selectedIds.length})
                </button>
              ) : (
                <button
                  onClick={() => restoreMutation.mutate(selectedIds)}
                  className="btn-secondary !py-2 !px-4 flex items-center gap-2 text-sm"
                >
                  <RotateCcw size={15} />
                  Restore ({selectedIds.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h2 className="text-base font-display font-semibold text-text-primary mb-4">Filters</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="label">Center</label>
            <select value={filters.briefing_center} onChange={(e) => setFilters(prev => ({ ...prev, briefing_center: e.target.value }))} className="input">
              <option value="">All Centers</option>
              {centersData?.centers?.map((c: any) => (
                <option key={c.id} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tour Type</label>
            <select value={filters.tour_type} onChange={(e) => setFilters(prev => ({ ...prev, tour_type: e.target.value }))} className="input">
              <option value="">All Types</option>
              {tourTypesData?.tourTypes?.map((t: any) => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Company</label>
            <select value={filters.company} onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))} className="input">
              <option value="">All Companies</option>
              {uniqueCompanies.map((company: string) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From Date</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={filters.archived} onChange={(e) => setFilters(prev => ({ ...prev, archived: e.target.value }))} className="input">
              <option value="false">Active</option>
              <option value="true">Archived</option>
            </select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-text-muted">Active filters:</span>
            {activeFilters.map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-forest-accent/15 text-forest-accent text-xs rounded-full border border-forest-accent/20"
              >
                <span className="capitalize">{key.replace('_', ' ')}: {value}</span>
                <button onClick={() => clearFilter(key as keyof typeof filters)} className="hover:text-white transition-colors duration-100">
                  <X size={11} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setFilters({ briefing_center: '', tour_type: '', date_from: '', date_to: '', company: '', archived: filters.archived })}
              className="text-text-secondary hover:text-text-primary text-xs transition-colors duration-150"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary text-sm">Loading responses...</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === sortedResponses.length && sortedResponses.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <SortHeader field="name">Respondent</SortHeader>
                <SortHeader field="company">Company</SortHeader>
                <SortHeader field="survey">Survey</SortHeader>
                <SortHeader field="center">Center</SortHeader>
                <SortHeader field="tourDate">Tour Date</SortHeader>
                <SortHeader field="completedAt">Completed</SortHeader>
                <th className="text-left px-4 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedResponses.map((response: any) => (
                <tr
                  key={response.id}
                  className={`table-row ${selectedIds.includes(response.id) ? 'bg-forest-accent/5' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(response.id)}
                      onChange={() => toggleSelect(response.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-text-primary text-base">{response.respondent?.name}</p>
                    <p className="text-sm text-text-muted mt-0.5">{response.respondent?.position}</p>
                  </td>
                  <td className="table-cell">{response.respondent?.company}</td>
                  <td className="table-cell">{response.survey?.title}</td>
                  <td className="table-cell">{response.survey?.briefingCenter?.code}</td>
                  <td className="table-cell">
                    {response.respondent?.tourDate && format(new Date(response.respondent.tourDate), 'MMM d, yyyy')}
                  </td>
                  <td className="table-cell">
                    {format(new Date(response.completedAt), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelectedResponse(response)}
                      className="link-accent text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {sortedResponses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-secondary text-sm">
                    No responses found with the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-muted mt-4">
        Showing {sortedResponses.length} of {allResponsesData?.responses?.length || 0} responses
      </p>

      {selectedResponse && (
        <ResponseModal response={selectedResponse} onClose={() => setSelectedResponse(null)} />
      )}

      {showAnalytics && selectedIds.length > 0 && (
        <GroupAnalyticsModal responses={selectedResponses} onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  )
}

function ResponseModal({ response, onClose }: { response: any; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['response', response.id],
    queryFn: () => api.responses.get(response.id),
  })

  const responseData = data?.response || response
  const respondent = responseData.respondent || {}
  const name = respondent.name || 'Unknown'
  const initials = getInitials(name)

  const pillItems = [
    respondent.company,
    respondent.position,
    respondent.tourDate ? format(new Date(respondent.tourDate), 'MMM d, yyyy') : null,
  ].filter(Boolean) as string[]

  const surveyTitle = responseData.survey?.title
  const completedAt = responseData.completedAt

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up overflow-hidden"
        style={{ background: '#111813', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Rich header */}
        <div className="shrink-0" style={{ background: '#0D1610', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-4 px-6 pt-5 pb-3">
            {/* Initials avatar */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
              style={{ background: '#C3D790', color: '#111813' }}
            >
              {initials}
            </div>
            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-text-primary text-xl leading-tight">{name}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-text-muted hover:text-text-primary transition-colors duration-150 p-1.5 rounded-lg hover:bg-forest-800"
            >
              <X size={18} />
            </button>
          </div>
          {/* Pill badges */}
          {pillItems.length > 0 && (
            <div className="flex flex-wrap gap-2 px-6 pb-4">
              {pillItems.map(label => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(195,215,144,0.1)', color: '#C3D790', border: '1px solid rgba(195,215,144,0.2)' }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable answer list */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 response-modal-scroll">
          {isLoading ? (
            <p className="text-text-secondary text-sm py-8 text-center">Loading answers…</p>
          ) : (
            <>
              {responseData.answers?.map((answer: any, index: number) => (
                <AnswerCard key={answer.id ?? index} answer={answer} index={index} />
              ))}
              {(!responseData.answers || responseData.answers.length === 0) && (
                <p className="text-text-secondary text-sm py-8 text-center">No answers recorded.</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {(surveyTitle || completedAt) && (
          <div
            className="px-6 py-3 shrink-0 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0D1610' }}
          >
            <span className="text-xs text-text-muted truncate mr-4">{surveyTitle || ''}</span>
            {completedAt && (
              <span className="text-xs text-text-muted shrink-0">
                {format(new Date(completedAt), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GroupAnalyticsModal({ responses, onClose }: { responses: any[]; onClose: () => void }) {
  // 'all' or respondent index (0-based)
  const [activeTab, setActiveTab] = useState<'all' | number>('all')

  const companies = useMemo(
    () => [...new Set(responses.map(r => r.respondent?.company).filter(Boolean))] as string[],
    [responses]
  )

  const aggregatedData = useMemo(() => {
    const questionMap = new Map<string, {
      text: string; type: string;
      answersByRespondent: Array<{ name: string; company: string; value: any; sentiment: number | null }>;
      sentimentScores: number[];
    }>()
    for (const response of responses) {
      if (!response.answers) continue
      for (const answer of response.answers) {
        const questionId = answer.question?.id || answer.questionId
        const questionText = answer.question?.text || `Question ${questionId}`
        const questionType = answer.question?.type || 'unknown'
        if (!questionMap.has(questionId)) {
          questionMap.set(questionId, { text: questionText, type: questionType, answersByRespondent: [], sentimentScores: [] })
        }
        const data = questionMap.get(questionId)!
        let value = answer.value
        if (typeof value === 'string') { try { value = JSON.parse(value) } catch { /* keep */ } }
        data.answersByRespondent.push({ name: response.respondent?.name || 'Unknown', company: response.respondent?.company || 'Unknown', value, sentiment: answer.sentimentScore })
        if (answer.sentimentScore != null) data.sentimentScores.push(answer.sentimentScore)
      }
    }
    return Array.from(questionMap.entries()).map(([id, data]) => ({
      id, ...data,
      avgSentiment: data.sentimentScores.length > 0
        ? data.sentimentScores.reduce((a, b) => a + b, 0) / data.sentimentScores.length
        : null,
    }))
  }, [responses])

  const overallSentiment = useMemo(() => {
    const scores = responses.flatMap(r =>
      (r.answers || [])
        .filter((a: any) => a.sentimentScore != null)
        .map((a: any) => a.sentimentScore as number)
    )
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  }, [responses])

  const activeResponse = typeof activeTab === 'number' ? responses[activeTab] : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col animate-slide-up overflow-hidden"
        style={{ background: '#111813', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Tab bar */}
        <div
          className="flex items-end px-4 pt-4 shrink-0 overflow-x-auto gap-0.5"
          style={{ background: '#0D1610', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* All tab */}
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-base font-body font-medium whitespace-nowrap transition-colors duration-150 border-b-2 -mb-px ${
              activeTab === 'all'
                ? 'border-forest-accent text-forest-accent'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            All
          </button>

          {/* Per-respondent tabs */}
          {responses.map((r, i) => {
            const firstName = (r.respondent?.name || 'Unknown').split(' ')[0]
            const fullName = r.respondent?.name || 'Unknown'
            return (
              <button
                key={i}
                title={fullName}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-base font-body font-medium whitespace-nowrap transition-colors duration-150 border-b-2 -mb-px ${
                  activeTab === i
                    ? 'border-forest-accent text-forest-accent'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {firstName}
              </button>
            )
          })}

          {/* Close button at far right */}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors duration-150 p-1.5 rounded-lg hover:bg-forest-800 mb-1 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ALL tab */}
          {activeTab === 'all' && (
            <>
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { value: responses.length, label: 'Responses' },
                  { value: companies.length, label: 'Companies' },
                  { value: overallSentiment != null ? `${Math.round(overallSentiment * 100)}%` : 'N/A', label: 'Avg Sentiment' },
                ].map(({ value, label }) => (
                  <div key={label} className="rounded-lg p-4 text-center" style={{ background: '#1A2820' }}>
                    <p className="text-2xl font-display font-bold text-forest-accent">{value}</p>
                    <p className="text-xs text-text-muted mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Question breakdowns — divided, no box borders */}
              <div className="divide-y divide-forest-800">
                {aggregatedData.map((question) => (
                  <div key={question.id} className="py-5">
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <p className="text-base font-medium text-text-primary">{question.text}</p>
                      {question.avgSentiment != null && (
                        <span
                          className="text-sm font-semibold shrink-0"
                          style={{ color: question.avgSentiment >= 0.7 ? '#C3D790' : question.avgSentiment >= 0.4 ? '#facc15' : '#f87171' }}
                        >
                          {Math.round(question.avgSentiment * 100)}%
                        </span>
                      )}
                    </div>
                    <QuestionBreakdown question={question} totalResponses={responses.length} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Individual respondent tab */}
          {activeResponse && (
            <>
              {/* Rich respondent header — mirrors ResponseModal style */}
              <div
                className="rounded-xl mb-5 overflow-hidden"
                style={{ background: '#0D1610', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-4 px-5 pt-4 pb-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ background: '#C3D790', color: '#111813' }}
                  >
                    {getInitials(activeResponse.respondent?.name || 'Unknown')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-text-primary text-xl leading-tight">
                      {activeResponse.respondent?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
                {[
                  activeResponse.respondent?.company,
                  activeResponse.respondent?.position,
                  activeResponse.respondent?.tourDate
                    ? format(new Date(activeResponse.respondent.tourDate), 'MMM d, yyyy')
                    : null,
                ].filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-2 px-5 pb-4">
                    {[
                      activeResponse.respondent?.company,
                      activeResponse.respondent?.position,
                      activeResponse.respondent?.tourDate
                        ? format(new Date(activeResponse.respondent.tourDate), 'MMM d, yyyy')
                        : null,
                    ].filter(Boolean).map((label: any) => (
                      <span
                        key={label}
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(195,215,144,0.1)', color: '#C3D790', border: '1px solid rgba(195,215,144,0.2)' }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Answer cards */}
              {activeResponse.answers?.map((answer: any, index: number) => (
                <AnswerCard key={answer.id ?? index} answer={answer} index={index} />
              ))}
              {(!activeResponse.answers || activeResponse.answers.length === 0) && (
                <p className="text-text-secondary text-sm py-8 text-center">No answers recorded.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestionBreakdown({ question, totalResponses }: {
  question: { type: string; answersByRespondent: Array<{ name: string; company: string; value: any; sentiment: number | null }> }
  totalResponses: number
}) {
  const breakdown = useMemo(() => {
    const counts = new Map<string, { count: number; respondents: string[] }>()
    for (const { name, value } of question.answersByRespondent) {
      if (Array.isArray(value)) {
        for (const item of value) {
          const key = String(item)
          const existing = counts.get(key) || { count: 0, respondents: [] }
          existing.count++; existing.respondents.push(name); counts.set(key, existing)
        }
      } else {
        const key = String(value)
        const existing = counts.get(key) || { count: 0, respondents: [] }
        existing.count++; existing.respondents.push(name); counts.set(key, existing)
      }
    }
    return Array.from(counts.entries())
      .map(([value, data]) => ({ value, count: data.count, respondents: data.respondents, percentage: (data.count / totalResponses) * 100 }))
      .sort((a, b) => b.count - a.count)
  }, [question.answersByRespondent, totalResponses])

  if (question.type === 'text') {
    return (
      <div className="divide-y divide-forest-800">
        {question.answersByRespondent.map((item, i) => (
          <div key={i} className="py-3 flex items-baseline gap-3">
            <span className="text-sm font-medium text-text-primary flex-1">"{item.value}"</span>
            <span className="text-sm text-text-muted shrink-0">— {item.name}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center gap-4 pb-2 mb-1" style={{ borderBottom: '1px solid #1A2820' }}>
        <span className="flex-1 text-xs text-text-muted uppercase tracking-wide">Answer</span>
        <span className="w-12 text-center text-xs text-text-muted uppercase tracking-wide">Count</span>
        <span className="w-12 text-right text-xs text-text-muted uppercase tracking-wide">Share</span>
      </div>
      {/* Answer rows */}
      <div className="divide-y divide-forest-800">
        {breakdown.map(({ value, count, respondents, percentage }) => (
          <div key={value} className="flex items-center gap-4 py-2.5">
            <span className="flex-1 text-sm text-text-primary" title={respondents.join(', ')}>{value}</span>
            <span className="w-12 text-center text-sm font-medium text-text-secondary">{count}</span>
            <span
              className="w-12 text-right text-sm font-semibold"
              style={{ color: percentage >= 60 ? '#C3D790' : percentage >= 30 ? '#facc15' : '#9BB5A5' }}
            >
              {percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
