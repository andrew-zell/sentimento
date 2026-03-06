import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

interface HostControlsProps {
  hostCode: string
  onSessionEnd?: () => void
}

export default function HostControls({ hostCode, onSessionEnd }: HostControlsProps) {
  const queryClient = useQueryClient()
  const [isMinimized, setIsMinimized] = useState(false)

  // Poll for session status
  const { data: statusData } = useQuery({
    queryKey: ['tour-status', hostCode],
    queryFn: () => api.tours.getStatus(hostCode),
    refetchInterval: 2000,
  })

  const startMutation = useMutation({
    mutationFn: () => api.tours.start(hostCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-status', hostCode] })
    },
  })

  const advanceMutation = useMutation({
    mutationFn: () => api.tours.advance(hostCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tour-status', hostCode] })
      if (data.hostLedComplete) {
        onSessionEnd?.()
      }
    },
  })

  const endMutation = useMutation({
    mutationFn: () => api.tours.end(hostCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-status', hostCode] })
      onSessionEnd?.()
    },
  })

  const session = statusData?.session
  const participants = session?.participants || []
  const isLobby = session?.status === 'lobby'
  const isActive = session?.status === 'active'

  // Calculate current question info
  const currentQuestionId = session?.currentQuestionId
  let currentQuestionText = ''
  let currentQuestionIndex = 0
  let totalHostLedQuestions = 0

  if (session?.survey?.surveyQuestionnaires) {
    const hostLedQuestions: any[] = []
    for (const sq of session.survey.surveyQuestionnaires) {
      if (sq.questionnaire.isHostLed) {
        for (const q of sq.questionnaire.questions) {
          hostLedQuestions.push(q)
        }
      }
    }
    totalHostLedQuestions = hostLedQuestions.length
    const idx = hostLedQuestions.findIndex(q => q.id === currentQuestionId)
    if (idx >= 0) {
      currentQuestionIndex = idx + 1
      currentQuestionText = hostLedQuestions[idx].text
    }
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 flex items-center gap-2"
      >
        <span className="text-lg">🎙️</span>
        Host Controls
        <span className="bg-blue-500 text-xs px-2 py-0.5 rounded-full">
          {participants.length}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎙️</span>
          <span className="font-semibold">Host Controls</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-400 hover:text-white"
        >
          −
        </button>
      </div>

      {/* Status */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isLobby ? 'bg-yellow-100 text-yellow-700' :
            isActive ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {isLobby ? 'In Lobby' : isActive ? 'Tour Active' : session?.status || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Participants */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Participants</span>
          <span className="text-lg font-bold text-gray-900">{participants.length}</span>
        </div>
        {participants.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {participants.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    p.status === 'in_lobby' ? 'bg-yellow-500' :
                    p.status === 'active' ? 'bg-green-500' :
                    p.status === 'completed' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`} />
                  <span className="text-gray-700">{p.respondent?.name}</span>
                </div>
                <span className="text-gray-400 text-xs">{p.respondent?.company}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Question (when active) */}
      {isActive && currentQuestionText && (
        <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
          <div className="text-xs text-blue-600 mb-1">
            Question {currentQuestionIndex} of {totalHostLedQuestions}
          </div>
          <p className="text-sm text-gray-900 font-medium line-clamp-2">
            {currentQuestionText}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-2">
        {isLobby && (
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending || participants.length === 0}
            className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {startMutation.isPending ? 'Starting...' : 'Start Tour'}
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={() => advanceMutation.mutate()}
              disabled={advanceMutation.isPending}
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {advanceMutation.isPending ? 'Advancing...' : 
                currentQuestionIndex >= totalHostLedQuestions ? 'End Host-Led Section' : 'Next Question'}
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to end the tour early?')) {
                  endMutation.mutate()
                }
              }}
              disabled={endMutation.isPending}
              className="w-full bg-gray-200 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              End Tour Early
            </button>
          </>
        )}
      </div>

      {/* Host Code */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Host Code</span>
          <code className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">{hostCode}</code>
        </div>
      </div>
    </div>
  )
}


