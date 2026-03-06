import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #1A2820 0%, #111813 50%, #0D150F 100%)' }}
    >
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(195,215,144,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(195,215,144,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-md relative animate-slide-up">
        {/* Logos */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <img
              src="/Resources_ExperienceCenter_White_1Line.svg"
              alt="Zoom Experience Center"
              className="h-10 w-auto"
            />
          </div>
          <div className="flex justify-center mb-6">
            <img
              src="/sentimento.svg"
              alt="Sentimento"
              className="h-6 w-auto opacity-70"
            />
          </div>
          <p className="text-text-secondary text-sm">
            Executive Briefing Center Survey Tool
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-forest-700/50 p-8 shadow-xl"
          style={{ background: 'rgba(20, 31, 25, 0.9)', backdropFilter: 'blur(12px)' }}
        >
          <h2 className="text-2xl font-display font-bold text-text-primary mb-6">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Bottom accent line */}
        <div className="mt-8 flex justify-center">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-forest-accent/30 to-transparent" />
        </div>
      </div>
    </div>
  )
}
