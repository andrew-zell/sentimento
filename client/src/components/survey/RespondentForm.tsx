import { useState } from 'react'

interface RespondentFormProps {
  onSubmit: (data: RespondentData) => void
  briefingCenterId: number
  isPulse?: boolean
}

interface RespondentData {
  name: string
  company: string
  position: string
  tourDate: string
  briefingCenterId: number
}

export default function RespondentForm({ onSubmit, briefingCenterId, isPulse }: RespondentFormProps) {
  const [formData, setFormData] = useState<RespondentData>({
    name: '',
    company: '',
    position: '',
    tourDate: new Date().toISOString().split('T')[0],
    briefingCenterId,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="card">
      <h2 className="text-xl font-display font-semibold text-gray-900 mb-6">
        {isPulse ? 'Quick Info' : 'Your Information'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="input"
            placeholder="Your name"
            required
          />
        </div>
        
        <div>
          <label htmlFor="company" className="label">Company</label>
          <input
            id="company"
            type="text"
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            className="input"
            placeholder="Your company"
            required
          />
        </div>
        
        {!isPulse && (
          <>
            <div>
              <label htmlFor="position" className="label">Position</label>
              <input
                id="position"
                type="text"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                className="input"
                placeholder="Your position"
              />
            </div>
            
            <div>
              <label htmlFor="tourDate" className="label">Tour Date</label>
              <input
                id="tourDate"
                type="date"
                value={formData.tourDate}
                onChange={(e) => setFormData(prev => ({ ...prev, tourDate: e.target.value }))}
                className="input"
                required
              />
            </div>
          </>
        )}
        
        <button type="submit" className="btn-primary w-full">
          {isPulse ? 'Start Pulse Survey' : 'Continue to Survey'}
        </button>
      </form>
    </div>
  )
}

