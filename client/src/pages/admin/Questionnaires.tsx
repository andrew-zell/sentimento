import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Plus, FileText } from 'lucide-react'

export default function Questionnaires() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: api.questionnaires.list,
  })

  const deleteMutation = useMutation({
    mutationFn: api.questionnaires.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] })
    },
  })

  const canEdit = user?.role === 'admin' || user?.role === 'editor'
  const canDelete = user?.role === 'admin'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-header mb-1">Questionnaires</h1>
          <p className="text-text-secondary text-sm">
            Reusable groups of questions that can be added to surveys
          </p>
        </div>
        {canEdit && (
          <Link to="/admin/questionnaires/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Questionnaire
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary animate-pulse-soft">Loading questionnaires...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.questionnaires?.map((q: any) => (
            <div
              key={q.id}
              className="card card-hover group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-forest-accent/10 border border-forest-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText size={16} className="text-forest-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-text-primary text-base leading-snug group-hover:text-forest-accent transition-colors duration-150">
                    {q.title}
                  </h3>
                  <div className="flex gap-2 mt-1.5">
                    {q.isFollowAlong && (
                      <span className="badge-active">Follow-along</span>
                    )}
                    {q.isHostLed && (
                      <span className="badge-active">Host-led</span>
                    )}
                  </div>
                </div>
              </div>

              {q.description && (
                <p className="text-text-secondary text-sm mb-4 leading-relaxed">{q.description}</p>
              )}

              <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(58,77,64,0.3)' }}>
                <span className="text-xs text-text-muted">
                  {q.questions?.length || 0} question{(q.questions?.length || 0) !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-4">
                  {canEdit && (
                    <Link
                      to={`/admin/questionnaires/${q.id}/edit`}
                      className="link-accent text-sm"
                    >
                      Edit
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this questionnaire?')) {
                          deleteMutation.mutate(q.id)
                        }
                      }}
                      className="link-danger text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {(!data?.questionnaires || data.questionnaires.length === 0) && (
            <div className="col-span-full card text-center py-12">
              <p className="text-text-secondary text-sm">
                No questionnaires yet. Create your first questionnaire to get started.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
