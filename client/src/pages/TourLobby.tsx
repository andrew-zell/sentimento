import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

interface TourLobbyProps {
  hostCode: string
  respondentId: number
  respondentName: string
  onTourStart: (session: any) => void
}

export default function TourLobby({ hostCode, respondentId, respondentName, onTourStart }: TourLobbyProps) {
  const [hasJoined, setHasJoined] = useState(false)
  const joinInitiated = useRef(false)

  // Poll for session status every 2 seconds
  const { data: statusData } = useQuery({
    queryKey: ['tour-status', hostCode],
    queryFn: () => api.tours.getStatus(hostCode),
    refetchInterval: 2000,
  })

  // Join the session on mount (using ref to prevent double-join in StrictMode)
  useEffect(() => {
    if (!joinInitiated.current) {
      joinInitiated.current = true
      api.tours.join(hostCode, respondentId)
        .then(() => setHasJoined(true))
        .catch(console.error)
    }
  }, [hostCode, respondentId])

  // Check if tour has started
  useEffect(() => {
    if (statusData?.session?.status === 'active') {
      onTourStart(statusData.session)
    }
  }, [statusData?.session?.status, onTourStart])

  const session = statusData?.session
  const participantCount = session?.participants?.length || 0

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src="/Resources_ExperienceCenter_White_1Line.svg" 
          alt="Zoom Experience Center" 
          className="h-10 w-auto"
        />
      </div>

      <div className="card max-w-md w-full text-center">
        {/* Animated waiting indicator */}
        <div className="mb-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-100/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-100 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Welcome, {respondentName}!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Please wait for your host to start the tour.
        </p>

        {/* Participant count */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700 mb-1">Participants ready</p>
          <p className="text-3xl font-display font-bold text-blue-900">
            {participantCount}
          </p>
        </div>

        {/* Participants list */}
        {session?.participants && session.participants.length > 0 && (
          <div className="text-left">
            <p className="text-sm text-gray-500 mb-2">Who's here:</p>
            <div className="flex flex-wrap gap-2">
              {session.participants.map((p: any) => (
                <span 
                  key={p.id}
                  className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  {p.respondent?.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-white/60 text-sm mt-6">
        The tour will begin automatically when the host is ready.
      </p>
    </div>
  )
}

