import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Link } from 'react-router-dom'
import { MessageSquare, TrendingUp, ClipboardList, FileText, type LucideIcon } from 'lucide-react'

export default function Dashboard() {
  const { data: summaryData } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: api.analytics.summary,
  })

  const { data: surveysData } = useQuery({
    queryKey: ['surveys'],
    queryFn: api.surveys.list,
  })

  const { data: responsesData } = useQuery({
    queryKey: ['responses-recent'],
    queryFn: () => api.responses.list({ limit: '5' }),
  })

  const summary = summaryData?.summary || {
    totalResponses: 0,
    totalSurveys: 0,
    totalQuestionnaires: 0,
    responsesToday: 0,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-header mb-1">Dashboard</h1>
        <p className="text-text-secondary text-sm">Welcome back</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Responses"
          value={summary.totalResponses}
          icon={MessageSquare}
          delay="stagger-1"
        />
        <StatCard
          title="Responses Today"
          value={summary.responsesToday}
          icon={TrendingUp}
          delay="stagger-2"
        />
        <StatCard
          title="Active Surveys"
          value={summary.totalSurveys}
          icon={ClipboardList}
          delay="stagger-3"
        />
        <StatCard
          title="Questionnaires"
          value={summary.totalQuestionnaires}
          icon={FileText}
          delay="stagger-4"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Surveys */}
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-header">Active Surveys</h2>
            <Link to="/admin/surveys" className="link-accent text-sm">
              View all →
            </Link>
          </div>
          <div className="space-y-1">
            {surveysData?.surveys?.slice(0, 5).map((survey: any) => (
              <div
                key={survey.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-forest-800/60 transition-colors duration-100 group"
              >
                <div>
                  <p className="font-medium text-text-primary text-sm group-hover:text-forest-accent transition-colors duration-150">
                    {survey.title}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {survey.briefingCenter?.code} · {survey.tourType?.name}
                  </p>
                </div>
                <span className={survey.isActive ? 'badge-active' : 'badge-inactive'}>
                  {survey.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            )) || (
              <p className="text-text-secondary text-center py-6 text-sm">No surveys yet</p>
            )}
          </div>
        </div>

        {/* Recent Responses */}
        <div className="card animate-slide-up" style={{ animationDelay: '75ms' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-header">Recent Responses</h2>
            <Link to="/admin/responses" className="link-accent text-sm">
              View all →
            </Link>
          </div>
          <div className="space-y-1">
            {responsesData?.responses?.slice(0, 5).map((response: any) => (
              <div
                key={response.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-forest-800/60 transition-colors duration-100"
              >
                <div>
                  <p className="font-medium text-text-primary text-sm">{response.respondent?.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {response.respondent?.company} · {response.survey?.title}
                  </p>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(response.completedAt).toLocaleDateString()}
                </span>
              </div>
            )) || (
              <p className="text-text-secondary text-center py-6 text-sm">No responses yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  delay,
}: {
  title: string
  value: number
  icon: LucideIcon
  delay: string
}) {
  return (
    <div className={`card card-hover animate-slide-up ${delay}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <div className="w-9 h-9 rounded-lg bg-forest-accent/10 border border-forest-accent/20 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-forest-accent" />
        </div>
      </div>
      <p className="text-3xl font-display font-bold text-text-primary">{value}</p>
    </div>
  )
}
