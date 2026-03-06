interface QuestionnaireTransitionProps {
  previousTitle: string
  nextTitle: string
  onContinue: () => void
  onDecline: () => void
}

export default function QuestionnaireTransition({
  previousTitle,
  nextTitle,
  onContinue,
  onDecline,
}: QuestionnaireTransitionProps) {
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
        {/* Success icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Thank You!
        </h1>
        
        <p className="text-gray-600 mb-2">
          You've completed the <span className="font-semibold">{previousTitle}</span> section.
        </p>

        <p className="text-gray-600 mb-8">
          Would you like to continue with a few more questions?
        </p>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-600 mb-1">Next up:</p>
          <p className="font-semibold text-blue-900">{nextTitle}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200"
          >
            No, I'm done
          </button>
          <button
            onClick={onContinue}
            className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700"
          >
            Yes, continue
          </button>
        </div>
      </div>
    </div>
  )
}


