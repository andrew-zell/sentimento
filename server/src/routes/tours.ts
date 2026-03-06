import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()

// Generate a unique host code
function generateHostCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// Create a new tour session (requires auth - admin/editor only)
router.post('/create', authenticate, async (req: AuthRequest, res) => {
  try {
    const { surveyId } = req.body
    const user = req.user!

    if (user.role !== 'admin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Verify survey exists and has host-led questionnaires
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        surveyQuestionnaires: {
          include: {
            questionnaire: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }

    const hasHostLed = survey.surveyQuestionnaires.some(
      sq => sq.questionnaire.isHostLed
    )

    if (!hasHostLed) {
      return res.status(400).json({ error: 'Survey has no host-led questionnaires' })
    }

    // Check for existing active session
    const existingSession = await prisma.tourSession.findFirst({
      where: {
        surveyId,
        status: { in: ['lobby', 'active'] },
      },
    })

    if (existingSession) {
      return res.json({ session: existingSession })
    }

    // Create new session
    const hostCode = generateHostCode()
    const session = await prisma.tourSession.create({
      data: {
        surveyId,
        hostCode,
        status: 'lobby',
      },
    })

    res.json({ session })
  } catch (error) {
    console.error('Error creating tour session:', error)
    res.status(500).json({ error: 'Failed to create tour session' })
  }
})

// Get active session for a survey (public - for participants to check)
router.get('/survey/:surveyId/active', async (req, res) => {
  try {
    const surveyId = parseInt(req.params.surveyId)

    const session = await prisma.tourSession.findFirst({
      where: {
        surveyId,
        status: { in: ['lobby', 'active'] },
      },
      include: {
        survey: {
          include: {
            surveyQuestionnaires: {
              include: {
                questionnaire: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    res.json({ session })
  } catch (error) {
    console.error('Error getting active session:', error)
    res.status(500).json({ error: 'Failed to get active session' })
  }
})

// Get session status (for participants polling)
router.get('/:hostCode/status', async (req, res) => {
  try {
    const { hostCode } = req.params

    const session = await prisma.tourSession.findUnique({
      where: { hostCode },
      include: {
        survey: {
          include: {
            surveyQuestionnaires: {
              include: {
                questionnaire: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        participants: {
          include: {
            respondent: true,
          },
        },
      },
    })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ session })
  } catch (error) {
    console.error('Error getting session status:', error)
    res.status(500).json({ error: 'Failed to get session status' })
  }
})

// Join a tour session (participant)
router.post('/:hostCode/join', async (req, res) => {
  try {
    const { hostCode } = req.params
    const { respondentId } = req.body

    const session = await prisma.tourSession.findUnique({
      where: { hostCode },
    })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session has ended' })
    }

    // Use upsert to atomically join or update (prevents duplicates)
    const participant = await prisma.tourParticipant.upsert({
      where: {
        sessionId_respondentId: {
          sessionId: session.id,
          respondentId,
        },
      },
      update: {
        lastSeenAt: new Date(),
      },
      create: {
        sessionId: session.id,
        respondentId,
        status: session.status === 'lobby' ? 'in_lobby' : 'active',
      },
      include: { respondent: true },
    })

    res.json({ participant })
  } catch (error) {
    console.error('Error joining tour session:', error)
    res.status(500).json({ error: 'Failed to join tour session' })
  }
})

// Start the tour (host only)
router.post('/:hostCode/start', async (req, res) => {
  try {
    const { hostCode } = req.params

    const session = await prisma.tourSession.findUnique({
      where: { hostCode },
      include: {
        survey: {
          include: {
            surveyQuestionnaires: {
              include: {
                questionnaire: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (session.status !== 'lobby') {
      return res.status(400).json({ error: 'Session already started' })
    }

    // Find the first question of the first host-led questionnaire
    const firstHostLedQuestionnaire = session.survey.surveyQuestionnaires.find(
      sq => sq.questionnaire.isHostLed
    )

    const firstQuestionId = firstHostLedQuestionnaire?.questionnaire.questions[0]?.id || null

    // Update session and all participants
    const updatedSession = await prisma.tourSession.update({
      where: { id: session.id },
      data: {
        status: 'active',
        startedAt: new Date(),
        currentQuestionId: firstQuestionId,
      },
    })

    await prisma.tourParticipant.updateMany({
      where: { sessionId: session.id },
      data: { status: 'active' },
    })

    res.json({ session: updatedSession })
  } catch (error) {
    console.error('Error starting tour:', error)
    res.status(500).json({ error: 'Failed to start tour' })
  }
})

// Advance to next question (host only)
router.post('/:hostCode/advance', async (req, res) => {
  try {
    const { hostCode } = req.params

    const session = await prisma.tourSession.findUnique({
      where: { hostCode },
      include: {
        survey: {
          include: {
            surveyQuestionnaires: {
              include: {
                questionnaire: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session not active' })
    }

    // Get all questions from host-led questionnaires in order
    const hostLedQuestions: number[] = []
    for (const sq of session.survey.surveyQuestionnaires) {
      if (sq.questionnaire.isHostLed) {
        for (const q of sq.questionnaire.questions) {
          hostLedQuestions.push(q.id)
        }
      }
    }

    const currentIndex = session.currentQuestionId 
      ? hostLedQuestions.indexOf(session.currentQuestionId)
      : -1

    const nextIndex = currentIndex + 1
    const isLastQuestion = nextIndex >= hostLedQuestions.length

    if (isLastQuestion) {
      // End the host-led portion
      const updatedSession = await prisma.tourSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          currentQuestionId: null,
          endedAt: new Date(),
        },
      })

      return res.json({ 
        session: updatedSession, 
        hostLedComplete: true,
        message: 'Host-led portion complete' 
      })
    }

    // Move to next question
    const nextQuestionId = hostLedQuestions[nextIndex]
    const updatedSession = await prisma.tourSession.update({
      where: { id: session.id },
      data: {
        currentQuestionId: nextQuestionId,
      },
    })

    res.json({ 
      session: updatedSession, 
      hostLedComplete: false,
      currentQuestionIndex: nextIndex,
      totalHostLedQuestions: hostLedQuestions.length,
    })
  } catch (error) {
    console.error('Error advancing tour:', error)
    res.status(500).json({ error: 'Failed to advance tour' })
  }
})

// Update participant progress
router.post('/:hostCode/progress', async (req, res) => {
  try {
    const { hostCode } = req.params
    const { participantId, questionId, completed } = req.body

    const session = await prisma.tourSession.findUnique({
      where: { hostCode },
    })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const updateData: any = {
      lastSeenAt: new Date(),
      currentQuestionId: questionId,
    }

    if (completed) {
      updateData.status = 'completed'
      updateData.completedAt = new Date()
    }

    const participant = await prisma.tourParticipant.update({
      where: { id: participantId },
      data: updateData,
    })

    res.json({ participant })
  } catch (error) {
    console.error('Error updating progress:', error)
    res.status(500).json({ error: 'Failed to update progress' })
  }
})

// Get participants for a session (host view)
router.get('/:hostCode/participants', async (req, res) => {
  try {
    const { hostCode } = req.params

    const session = await prisma.tourSession.findUnique({
      where: { hostCode },
      include: {
        participants: {
          include: {
            respondent: true,
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ participants: session.participants })
  } catch (error) {
    console.error('Error getting participants:', error)
    res.status(500).json({ error: 'Failed to get participants' })
  }
})

// End session manually (host)
router.post('/:hostCode/end', async (req, res) => {
  try {
    const { hostCode } = req.params

    const session = await prisma.tourSession.update({
      where: { hostCode },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    })

    res.json({ session })
  } catch (error) {
    console.error('Error ending session:', error)
    res.status(500).json({ error: 'Failed to end session' })
  }
})

export default router

