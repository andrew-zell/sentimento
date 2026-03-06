import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function Analytics() {
  const [sentimentQuestionnaire, setSentimentQuestionnaire] = useState('all')

  const { data: summaryData } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: api.analytics.summary,
  })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: api.centers.list,
  })

  const { data: questionnairesData } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: api.questionnaires.list,
  })

  const { data: responsesData } = useQuery({
    queryKey: ['responses', { archived: 'false' }],
    queryFn: () => api.responses.list({ archived: 'false', limit: '1000' }),
  })

  const summary = summaryData?.summary || {}

  const responsesByCenter = centersData?.centers?.map((center: any) => {
    const count = responsesData?.responses?.filter(
      (r: any) => r.survey?.briefingCenter?.code === center.code
    ).length || 0
    return { code: center.code, name: center.name, count }
  }) || []

  const getSentimentData = () => {
    if (!responsesData?.responses) return []
    const dataByDate = new Map<string, { sum: number; count: number }>()
    for (const response of responsesData.responses) {
      const dateKey = new Date(response.completedAt).toLocaleDateString()
      for (const answer of response.answers || []) {
        if (sentimentQuestionnaire !== 'all') {
          const questionnaireId = answer.question?.questionnaireId
          if (questionnaireId !== parseInt(sentimentQuestionnaire)) continue
        }
        if (answer.sentimentScore !== null && answer.sentimentScore !== undefined) {
          const existing = dataByDate.get(dateKey) || { sum: 0, count: 0 }
          existing.sum += answer.sentimentScore
          existing.count++
          dataByDate.set(dateKey, existing)
        }
      }
    }
    return Array.from(dataByDate.entries())
      .map(([date, data]) => ({ label: date, avgSentiment: data.count > 0 ? data.sum / data.count : null }))
      .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime())
      .slice(-30)
  }

  const sentimentData = getSentimentData()

  const chartTooltipStyle = {
    backgroundColor: '#141F19',
    border: '1px solid rgba(58, 77, 64, 0.6)',
    borderRadius: '8px',
    color: '#E8F0E8',
    fontSize: '12px',
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="page-header mb-1">Analytics</h1>
        <p className="text-text-secondary text-sm">Survey performance and sentiment insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard title="Total Responses" value={summary.totalResponses || 0} delay="stagger-1" />
        <SummaryCard title="Avg Sentiment" value={summary.avgSentiment ? `${(summary.avgSentiment * 100).toFixed(0)}%` : 'N/A'} delay="stagger-2" highlight />
        <SummaryCard title="This Month" value={summary.responsesThisMonth || 0} delay="stagger-3" />
        <SummaryCard title="Questionnaires" value={summary.totalQuestionnaires || 0} delay="stagger-4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Responses by Center */}
        <div className="card animate-slide-up">
          <h2 className="section-header mb-6">Responses by Center</h2>
          <div className="space-y-3">
            {responsesByCenter.length > 0 ? (
              responsesByCenter.map((center: any) => (
                <div key={center.code} className="flex items-center justify-between p-4 rounded-lg transition-colors duration-150"
                  style={{ background: '#1A2820', border: '1px solid rgba(58,77,64,0.35)' }}>
                  <div>
                    <p className="font-semibold text-text-primary text-base">{center.name}</p>
                    <p className="text-sm text-text-muted mt-0.5">{center.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-display font-bold text-forest-accent">{center.count}</p>
                    <p className="text-sm text-text-muted">responses</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-secondary text-center py-8 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Sentiment Trend */}
        <div className="card animate-slide-up" style={{ animationDelay: '75ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-header">Sentiment Trend</h2>
            <select
              value={sentimentQuestionnaire}
              onChange={(e) => setSentimentQuestionnaire(e.target.value)}
              className="input !w-auto !h-9 text-xs px-3"
            >
              <option value="all">All Questionnaires</option>
              {questionnairesData?.questionnaires?.map((q: any) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
          {sentimentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(58, 77, 64, 0.5)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8FA08A' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8FA08A' }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number) => [`${(value * 100).toFixed(0)}%`, 'Sentiment']}
                />
                <Line
                  type="monotone"
                  dataKey="avgSentiment"
                  stroke="#C3D790"
                  strokeWidth={2}
                  dot={{ fill: '#C3D790', strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: '#C3D790', r: 5, strokeWidth: 2, stroke: '#141F19' }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-text-secondary text-sm">
              No sentiment data available
            </div>
          )}
        </div>

        {/* Overall Satisfaction Gauge */}
        <div className="card animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h2 className="section-header mb-6">Overall Satisfaction</h2>
          <div className="h-56 flex flex-col items-center justify-center">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(58, 77, 64, 0.6)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#C3D790" strokeWidth="8"
                  strokeDasharray={`${(summary.avgSentiment || 0) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-text-primary">
                  {summary.avgSentiment ? `${(summary.avgSentiment * 100).toFixed(0)}%` : 'N/A'}
                </span>
              </div>
            </div>
            <p className="text-text-secondary text-sm mt-4">Average satisfaction score</p>
          </div>
        </div>

        {/* Responses by Tour Type */}
        <div className="card animate-slide-up" style={{ animationDelay: '225ms' }}>
          <h2 className="section-header mb-6">Responses by Tour Type</h2>
          <div className="space-y-3">
            {(() => {
              const inPersonCount = responsesData?.responses?.filter((r: any) => r.survey?.tourType?.slug === 'inperson').length || 0
              const virtualCount = responsesData?.responses?.filter((r: any) => r.survey?.tourType?.slug === 'virtualtour').length || 0
              return (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg transition-colors duration-150"
                    style={{ background: '#1A2820', border: '1px solid rgba(58,77,64,0.35)' }}>
                    <div>
                      <p className="font-semibold text-text-primary text-base">In-Person</p>
                      <p className="text-sm text-text-muted mt-0.5">Physical tours</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold text-forest-accent">{inPersonCount}</p>
                      <p className="text-sm text-text-muted">responses</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg transition-colors duration-150"
                    style={{ background: '#1A2820', border: '1px solid rgba(58,77,64,0.35)' }}>
                    <div>
                      <p className="font-semibold text-text-primary text-base">Virtual Tour</p>
                      <p className="text-sm text-text-muted mt-0.5">Online tours</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold text-forest-accent">{virtualCount}</p>
                      <p className="text-sm text-text-muted">responses</p>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, delay, highlight }: { title: string; value: string | number; delay: string; highlight?: boolean }) {
  return (
    <div className={`card card-hover animate-slide-up ${delay}`}>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">{title}</p>
      <p className={`text-3xl font-display font-bold ${highlight ? 'text-forest-accent' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}
