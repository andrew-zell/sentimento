import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import SurveyRenderer from '../components/survey/SurveyRenderer'
import RespondentForm from '../components/survey/RespondentForm'

export default function PulseSurvey() {
  const { centerCode, tourType } = useParams<{ centerCode: string; tourType: string }>()
  const navigate = useNavigate()
  const [respondent, setRespondent] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<number, any>>({})

  const { data, isLoading, error } = useQuery({
    queryKey: ['pulse-survey', centerCode, tourType],
    queryFn: () => api.surveys.getByRoute(centerCode!, tourType!),
    enabled: !!centerCode && !!tourType,
    select: (data) => {
      // Filter to only include follow-along questionnaires
      if (data.survey) {
        return {
          survey: {
            ...data.survey,
            surveyQuestionnaires: data.survey.surveyQuestionnaires?.filter(
              (sq: any) => sq.questionnaire.isFollowAlong
            ),
          },
        }
      }
      return data
    },
  })

  const submitMutation = useMutation({
    mutationFn: api.responses.submit,
    onSuccess: () => {
      navigate('/survey/complete')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-lg animate-pulse-soft">Loading pulse survey...</div>
      </div>
    )
  }

  if (error || !data?.survey) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-display font-semibold text-gray-900 mb-2">
            Pulse Survey Not Found
          </h1>
          <p className="text-gray-600">
            The pulse survey you're looking for doesn't exist or is no longer active.
          </p>
        </div>
      </div>
    )
  }

  const handleRespondentSubmit = (data: any) => {
    setRespondent(data)
  }

  const handleSurveySubmit = () => {
    submitMutation.mutate({
      surveyId: data.survey.id,
      respondent,
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId: parseInt(questionId),
        value,
      })),
      isPulse: true,
    })
  }

  if (!respondent) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              Follow-Along Survey
            </h1>
            <p className="text-blue-200">
              Quick feedback as you go
            </p>
          </div>
          <RespondentForm 
            onSubmit={handleRespondentSubmit}
            briefingCenterId={data.survey.briefingCenterId}
            isPulse
          />
        </div>
      </div>
    )
  }

  return (
    <SurveyRenderer
      survey={data.survey}
      answers={answers}
      onAnswerChange={(questionId, value) => 
        setAnswers(prev => ({ ...prev, [questionId]: value }))
      }
      onSubmit={handleSurveySubmit}
      isSubmitting={submitMutation.isPending}
      isPulse
    />
  )
}

