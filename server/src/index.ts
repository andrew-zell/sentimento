import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import centerRoutes from './routes/centers.js'
import tourTypeRoutes from './routes/tourTypes.js'
import questionnaireRoutes from './routes/questionnaires.js'
import surveyRoutes from './routes/surveys.js'
import responseRoutes from './routes/responses.js'
import analyticsRoutes from './routes/analytics.js'
import tourRoutes from './routes/tours.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/briefing-centers', centerRoutes)
app.use('/api/tour-types', tourTypeRoutes)
app.use('/api/questionnaires', questionnaireRoutes)
app.use('/api/surveys', surveyRoutes)
app.use('/api/responses', responseRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/tours', tourRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

