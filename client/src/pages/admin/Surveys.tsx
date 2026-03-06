import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Plus } from 'lucide-react'

export default function Surveys() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: api.surveys.list,
  })

  const deleteMutation = useMutation({
    mutationFn: api.surveys.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })

  const canEdit = user?.role === 'admin' || user?.role === 'editor'
  const canDelete = user?.role === 'admin'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-header mb-0">Surveys</h1>
        {canEdit && (
          <Link to="/admin/surveys/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Survey
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary animate-pulse-soft">Loading surveys...</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Title</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Center</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Tour Type</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Questionnaires</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.surveys?.map((survey: any) => (
                <tr key={survey.id} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium text-text-primary text-sm">{survey.title}</p>
                    <p className="text-xs text-text-muted mt-0.5 font-mono">
                      /{survey.briefingCenter?.code}/{survey.tourType?.slug}
                    </p>
                  </td>
                  <td className="table-cell">{survey.briefingCenter?.name}</td>
                  <td className="table-cell">{survey.tourType?.name}</td>
                  <td className="table-cell">{survey.surveyQuestionnaires?.length || 0}</td>
                  <td className="px-6 py-4">
                    <span className={survey.isActive ? 'badge-active' : 'badge-inactive'}>
                      {survey.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    {canEdit && (
                      <Link
                        to={`/admin/surveys/${survey.id}/edit`}
                        className="link-accent text-sm"
                      >
                        Edit
                      </Link>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this survey?')) {
                            deleteMutation.mutate(survey.id)
                          }
                        }}
                        className="link-danger text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!data?.surveys || data.surveys.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-secondary text-sm">
                    No surveys yet. Create your first survey to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
