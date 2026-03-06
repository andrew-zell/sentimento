export default function SurveyComplete() {
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
      <div className="card max-w-md text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">
          Thank You!
        </h1>
        <p className="text-gray-600 mb-6">
          Your feedback has been submitted successfully. We appreciate you taking the time to share your thoughts.
        </p>
        <div className="text-sm text-gray-500">
          You can close this window now.
        </div>
      </div>
    </div>
  )
}
