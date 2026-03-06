import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import QuestionRenderer from './QuestionRenderer'

interface Survey {
  id: number
  title: string
  surveyQuestionnaires: {
    id: number
    order: number
    questionnaire: {
      id: number
      title: string
      description: string | null
      isFollowAlong: boolean
      isHostLed?: boolean
      questions: {
        id: number
        text: string
        type: string
        options: any
        order: number
        isRequired: boolean
      }[]
    }
  }[]
}

interface SurveyRendererProps {
  survey: Survey
  answers: Record<number, any>
  onAnswerChange: (questionId: number, value: any) => void
  onSubmit: () => void
  isSubmitting: boolean
  isPulse?: boolean
  tourSession?: any
  inHostLedSection?: boolean
  onHostLedComplete?: (fromTitle: string, toTitle: string) => void
}

export default function SurveyRenderer({
  survey,
  answers,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  isPulse,
  tourSession,
  inHostLedSection,
  onHostLedComplete,
}: SurveyRendererProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Poll for tour session status if in a tour
  const { data: sessionData } = useQuery({
    queryKey: ['tour-status', tourSession?.hostCode],
    queryFn: () => api.tours.getStatus(tourSession!.hostCode),
    enabled: !!tourSession?.hostCode && inHostLedSection,
    refetchInterval: 2000,
  })

  const currentUnlockedQuestionId = sessionData?.session?.currentQuestionId || tourSession?.currentQuestionId

  // Flatten all questions from all questionnaires
  const { allQuestions, hostLedQuestionIds, firstNonHostLedQuestionnaire } = useMemo(() => {
    const questions: Array<{
      question: Survey['surveyQuestionnaires'][0]['questionnaire']['questions'][0]
      questionnaire: Survey['surveyQuestionnaires'][0]['questionnaire']
      isHostLed: boolean
    }> = []
    
    const hostLedIds: number[] = []
    let firstNonHostLed: Survey['surveyQuestionnaires'][0]['questionnaire'] | null = null
    let foundHostLed = false
    
    const sortedQuestionnaires = [...(survey.surveyQuestionnaires || [])].sort(
      (a, b) => a.order - b.order
    )
    
    for (const sq of sortedQuestionnaires) {
      const isHostLed = sq.questionnaire.isHostLed || false
      
      if (isHostLed) {
        foundHostLed = true
      } else if (foundHostLed && !firstNonHostLed) {
        firstNonHostLed = sq.questionnaire
      }
      
      const sortedQuestions = [...sq.questionnaire.questions].sort(
        (a, b) => a.order - b.order
      )
      
      for (const question of sortedQuestions) {
        questions.push({
          question,
          questionnaire: sq.questionnaire,
          isHostLed,
        })
        
        if (isHostLed) {
          hostLedIds.push(question.id)
        }
      }
    }
    
    return { 
      allQuestions: questions, 
      hostLedQuestionIds: hostLedIds,
      firstNonHostLedQuestionnaire: firstNonHostLed,
    }
  }, [survey])

  // Filter questions based on whether we're in host-led section
  const visibleQuestions = useMemo(() => {
    if (!inHostLedSection) {
      // Show only non-host-led questions when not in host-led section
      return allQuestions.filter(q => !q.isHostLed)
    }
    // Show only host-led questions during host-led section
    return allQuestions.filter(q => q.isHostLed)
  }, [allQuestions, inHostLedSection])

  const totalQuestions = visibleQuestions.length
  const progress = totalQuestions > 0 
    ? ((currentQuestionIndex + 1) / totalQuestions) * 100 
    : 0

  const currentItem = visibleQuestions[currentQuestionIndex]
  const currentAnswer = currentItem ? answers[currentItem.question.id] : undefined

  // Check if current question is unlocked (for host-led sections)
  const isQuestionUnlocked = useMemo(() => {
    if (!inHostLedSection || !currentUnlockedQuestionId) {
      return true // Not in host-led mode or no unlock tracking
    }
    
    const unlockedIndex = hostLedQuestionIds.indexOf(currentUnlockedQuestionId)
    const currentIndex = hostLedQuestionIds.indexOf(currentItem?.question.id || 0)
    
    return currentIndex <= unlockedIndex
  }, [inHostLedSection, currentUnlockedQuestionId, hostLedQuestionIds, currentItem])

  // Check if next question is unlocked
  const isNextUnlocked = useMemo(() => {
    if (!inHostLedSection || !currentUnlockedQuestionId) {
      return true
    }
    
    const nextItem = visibleQuestions[currentQuestionIndex + 1]
    if (!nextItem) return true // No next question
    
    const unlockedIndex = hostLedQuestionIds.indexOf(currentUnlockedQuestionId)
    const nextIndex = hostLedQuestionIds.indexOf(nextItem.question.id)
    
    return nextIndex <= unlockedIndex
  }, [inHostLedSection, currentUnlockedQuestionId, hostLedQuestionIds, visibleQuestions, currentQuestionIndex])

  const canGoNext = (!currentItem?.question.isRequired || currentAnswer !== undefined) && isNextUnlocked
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1

  const handleNext = () => {
    if (isLastQuestion) {
      if (inHostLedSection && firstNonHostLedQuestionnaire) {
        // Transition to non-host-led section
        const lastHostLed = visibleQuestions[currentQuestionIndex]?.questionnaire.title || 'Follow-Along'
        onHostLedComplete?.(lastHostLed, firstNonHostLedQuestionnaire.title)
      } else {
        onSubmit()
      }
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1))
  }

  // Reset to first question when switching sections
  useEffect(() => {
    setCurrentQuestionIndex(0)
  }, [inHostLedSection])

  if (totalQuestions === 0) {
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
            No Questions
          </h1>
          <p className="text-gray-600">
            This survey doesn't have any questions yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-blue-900/50 z-50">
        <div 
          className="h-full bg-blue-100 progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Logo - centered at top */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
        <img 
          src="/Resources_ExperienceCenter_White_1Line.svg" 
          alt="Zoom Experience Center" 
          className="h-10 w-auto"
        />
      </div>
      
      {/* Question counter */}
      <div className="fixed top-4 right-4 text-white/80 text-sm font-medium z-40">
        {currentQuestionIndex + 1} / {totalQuestions}
      </div>

      {/* Host-led indicator */}
      {inHostLedSection && (
        <div className="fixed top-4 left-4 z-40">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-white text-xs">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Host-led session
          </span>
        </div>
      )}
      
      {/* Survey content */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20 pb-24">
        <div className="w-full max-w-xl">
          {/* Questionnaire title */}
          {currentItem && (
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-white text-sm">
                {currentItem.questionnaire.title}
              </span>
            </div>
          )}
          
          {/* Question */}
          <div className="card-static" key={currentItem?.question.id}>
            <QuestionRenderer
              question={currentItem.question}
              value={currentAnswer}
              onChange={(value) => onAnswerChange(currentItem.question.id, value)}
            />
          </div>

          {/* Waiting for host indicator */}
          {inHostLedSection && !isNextUnlocked && currentAnswer !== undefined && (
            <div className="mt-4 text-center">
              <p className="text-white/70 text-sm flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Waiting for host to advance...
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-blue-900 to-transparent">
        <div className="max-w-xl mx-auto flex gap-3">
          {currentQuestionIndex > 0 && (
            <button
              onClick={handleBack}
              className="btn-secondary flex-1"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canGoNext || isSubmitting}
            className="btn-primary flex-1"
          >
            {isSubmitting 
              ? 'Submitting...' 
              : isLastQuestion 
                ? (inHostLedSection && firstNonHostLedQuestionnaire ? 'Continue' : 'Submit')
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
