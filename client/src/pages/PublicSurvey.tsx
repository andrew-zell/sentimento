import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import SurveyRenderer from '../components/survey/SurveyRenderer'
import RespondentForm from '../components/survey/RespondentForm'
import TourLobby from './TourLobby'
import HostControls from '../components/tour/HostControls'
import QuestionnaireTransition from '../components/tour/QuestionnaireTransition'

interface TourState {
  session: any | null
  hostCode: string | null
  isHost: boolean
  participantId: string | null
  inHostLedSection: boolean
  showTransition: boolean
  transitionFrom: string
  transitionTo: string
}

export default function PublicSurvey() {
  const { centerCode, tourType } = useParams<{ centerCode: string; tourType: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [respondent, setRespondent] = useState<any>(null)
  const [respondentId, setRespondentId] = useState<number | null>(null)
  const [respondentSaved, setRespondentSaved] = useState(false)
  const [answers, setAnswers] = useState<Record<number, any>>({})
  
  // Tour state
  const [tourState, setTourState] = useState<TourState>({
    session: null,
    hostCode: searchParams.get('host'),
    isHost: !!searchParams.get('host'),
    participantId: null,
    inHostLedSection: false,
    showTransition: false,
    transitionFrom: '',
    transitionTo: '',
  })

  // Fetch survey
  const { data, isLoading, error } = useQuery({
    queryKey: ['survey', centerCode, tourType],
    queryFn: () => api.surveys.getByRoute(centerCode!, tourType!),
    enabled: !!centerCode && !!tourType,
  })

  // Check for active tour session
  const { data: activeSessionData } = useQuery({
    queryKey: ['active-tour-session', data?.survey?.id],
    queryFn: () => api.tours.getActiveSession(data!.survey.id),
    enabled: !!data?.survey?.id && !tourState.isHost,
  })

  // Update tour state when active session is found
  useEffect(() => {
    if (activeSessionData?.session && !tourState.isHost) {
      setTourState(prev => ({
        ...prev,
        session: activeSessionData.session,
        hostCode: activeSessionData.session.hostCode,
        inHostLedSection: activeSessionData.session.status === 'active',
      }))
    }
  }, [activeSessionData?.session, tourState.isHost])

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: api.responses.submit,
    onSuccess: () => {
      navigate('/survey/complete')
    },
  })

  // Handle tour start (from lobby)
  const handleTourStart = useCallback((session: any) => {
    setTourState(prev => ({
      ...prev,
      session,
      inHostLedSection: true,
    }))
  }, [])

  // Handle respondent form submission
  const handleRespondentSubmit = async (formData: any) => {
    setRespondent(formData)
    
    // Always create respondent in database to get a real ID
    // This is needed for tour session joining AND for later survey submission
    try {
      const result = await api.responses.createRespondent({
        name: formData.name,
        company: formData.company,
        position: formData.position,
        tourDate: formData.tourDate,
        briefingCenterId: data!.survey.briefingCenterId,
      })
      setRespondentId(result.respondent.id)
      setRespondentSaved(true)
    } catch (err) {
      console.error('Failed to create respondent:', err)
      // If creation fails, we still allow proceeding - the submit will create one
      setRespondentSaved(false)
    }
  }

  // Handle survey submission
  const handleSurveySubmit = () => {
    const payload: any = {
      surveyId: data!.survey.id,
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId: parseInt(questionId),
        value,
      })),
    }
    
    // Use existing respondentId if we created one earlier, otherwise pass respondent data
    if (respondentSaved && respondentId) {
      payload.respondentId = respondentId
    } else {
      payload.respondent = {
        ...respondent,
        briefingCenterId: data!.survey.briefingCenterId,
      }
    }
    
    submitMutation.mutate(payload)
  }

  // Handle transition continue
  const handleTransitionContinue = () => {
    setTourState(prev => ({
      ...prev,
      showTransition: false,
      inHostLedSection: false,
    }))
  }

  // Handle transition decline
  const handleTransitionDecline = () => {
    // Submit what we have and complete
    handleSurveySubmit()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col items-center justify-center">
        <div className="mb-8">
          <img 
            src="/Resources_ExperienceCenter_White_1Line.svg" 
            alt="Zoom Experience Center" 
            className="h-10 w-auto"
          />
        </div>
        <div className="text-white text-lg">Loading survey...</div>
      </div>
    )
  }

  // Error state
  if (error || !data?.survey) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
        <div className="mb-8">
          <img 
            src="/Resources_ExperienceCenter_White_1Line.svg" 
            alt="Zoom Experience Center" 
            className="h-10 w-auto"
          />
        </div>
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-display font-semibold text-gray-900 mb-2">
            Survey Not Found
          </h1>
          <p className="text-gray-600">
            The survey you're looking for doesn't exist or is no longer active.
          </p>
        </div>
      </div>
    )
  }

  // Transition screen between host-led and self-paced questionnaires
  if (tourState.showTransition) {
    return (
      <QuestionnaireTransition
        previousTitle={tourState.transitionFrom}
        nextTitle={tourState.transitionTo}
        onContinue={handleTransitionContinue}
        onDecline={handleTransitionDecline}
      />
    )
  }

  // Show respondent form first
  if (!respondent) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
        <div className="mb-8">
          <img 
            src="/Resources_ExperienceCenter_White_1Line.svg" 
            alt="Zoom Experience Center" 
            className="h-10 w-auto"
          />
        </div>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              {data.survey.title}
            </h1>
            <p className="text-gray-200">
              Please tell us a bit about yourself
            </p>
          </div>
          <RespondentForm 
            onSubmit={handleRespondentSubmit}
            briefingCenterId={data.survey.briefingCenterId}
          />
        </div>
        
        {/* Host controls if this is a host */}
        {tourState.isHost && tourState.hostCode && (
          <HostControls hostCode={tourState.hostCode} />
        )}
      </div>
    )
  }

  // Show lobby if there's an active session in lobby state and participant hasn't entered yet
  if (tourState.session?.status === 'lobby' && !tourState.isHost && respondentSaved && respondentId) {
    return (
      <TourLobby
        hostCode={tourState.hostCode!}
        respondentId={respondentId}
        respondentName={respondent.name}
        onTourStart={handleTourStart}
      />
    )
  }

  // Main survey renderer with tour integration
  return (
    <>
      <SurveyRenderer
        survey={data.survey}
        answers={answers}
        onAnswerChange={(questionId, value) => 
          setAnswers(prev => ({ ...prev, [questionId]: value }))
        }
        onSubmit={handleSurveySubmit}
        isSubmitting={submitMutation.isPending}
        tourSession={tourState.session}
        inHostLedSection={tourState.inHostLedSection}
        onHostLedComplete={(fromTitle: string, toTitle: string) => {
          setTourState(prev => ({
            ...prev,
            showTransition: true,
            transitionFrom: fromTitle,
            transitionTo: toTitle,
          }))
        }}
      />
      
      {/* Host controls overlay */}
      {tourState.isHost && tourState.hostCode && (
        <HostControls 
          hostCode={tourState.hostCode}
          onSessionEnd={() => {
            // Find transition info
            const questionnaires = data.survey.surveyQuestionnaires
            const hostLedIdx = questionnaires.findIndex((sq: any) => sq.questionnaire.isHostLed)
            const nextIdx = questionnaires.findIndex((sq: any, idx: number) => 
              idx > hostLedIdx && !sq.questionnaire.isHostLed
            )
            
            if (nextIdx >= 0) {
              setTourState(prev => ({
                ...prev,
                showTransition: true,
                transitionFrom: questionnaires[hostLedIdx].questionnaire.title,
                transitionTo: questionnaires[nextIdx].questionnaire.title,
              }))
            }
          }}
        />
      )}
    </>
  )
}
