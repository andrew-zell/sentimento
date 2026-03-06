import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { calculateSentiment } from '../services/sentiment.js'

const router = Router()

function tryParseJSON(str: string) {
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

const respondentSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  position: z.string().optional(),
  tourDate: z.string(),
  briefingCenterId: z.number(),
})

const answerSchema = z.object({
  questionId: z.number(),
  value: z.any(),
})

const submitResponseSchema = z.object({
  surveyId: z.number(),
  respondent: respondentSchema.optional(),
  respondentId: z.number().optional(),
  answers: z.array(answerSchema),
  isPulse: z.boolean().optional(),
})

// GET /api/responses - List responses with filters
router.get('/', authenticate, async (req: AuthRequest, res) => {
  const {
    briefing_center,
    tour_type,
    date_from,
    date_to,
    company,
    questionnaire_id,
    question_id,
    archived,
    limit = '50',
    offset = '0',
  } = req.query as Record<string, string | undefined>
  
  const where: any = {}
  
  if (archived !== undefined) {
    where.isArchived = archived === 'true'
  }
  
  if (briefing_center) {
    where.survey = {
      ...where.survey,
      briefingCenter: { code: { in: briefing_center.split(',') } },
    }
  }
  
  if (tour_type) {
    where.survey = {
      ...where.survey,
      tourType: { slug: { in: tour_type.split(',') } },
    }
  }
  
  if (date_from || date_to) {
    where.completedAt = {}
    if (date_from) where.completedAt.gte = new Date(date_from)
    if (date_to) where.completedAt.lte = new Date(date_to)
  }
  
  if (company) {
    where.respondent = {
      company: { contains: company, mode: 'insensitive' },
    }
  }
  
  const [responses, total] = await Promise.all([
    prisma.response.findMany({
      where,
      include: {
        survey: {
          include: {
            briefingCenter: true,
            tourType: true,
          },
        },
        respondent: true,
        answers: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    }),
    prisma.response.count({ where }),
  ])
  
  // Parse JSON values for answers
  const parsedResponses = responses.map(r => ({
    ...r,
    answers: r.answers.map(a => ({
      ...a,
      value: typeof a.value === 'string' ? tryParseJSON(a.value) : a.value,
      question: a.question ? {
        ...a.question,
        options: a.question.options ? tryParseJSON(a.question.options) : null,
      } : null,
    })),
  }))
  
  res.json({ responses: parsedResponses, total })
})

// GET /api/responses/:id
router.get('/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id)
  const response = await prisma.response.findUnique({
    where: { id },
    include: {
      survey: {
        include: {
          briefingCenter: true,
          tourType: true,
        },
      },
      respondent: true,
      answers: {
        include: {
          question: {
            include: {
              questionnaire: true,
            },
          },
        },
      },
    },
  })
  
  if (!response) {
    return res.status(404).json({ message: 'Response not found' })
  }
  
  // Parse JSON options and values for the response
  const parsedResponse = {
    ...response,
    answers: response.answers.map(a => ({
      ...a,
      value: typeof a.value === 'string' ? tryParseJSON(a.value) : a.value,
      question: a.question ? {
        ...a.question,
        options: a.question.options ? tryParseJSON(a.question.options) : null,
      } : null,
    })),
  }
  
  res.json({ response: parsedResponse })
})

// POST /api/responses - Submit a survey response (public)
router.post('/', async (req, res) => {
  try {
    const data = submitResponseSchema.parse(req.body)
    
    // Check survey exists and is active
    const survey = await prisma.survey.findUnique({
      where: { id: data.surveyId },
      include: {
        surveyQuestionnaires: {
          include: {
            questionnaire: {
              include: {
                questions: true,
              },
            },
          },
        },
      },
    })
    
    if (!survey || !survey.isActive) {
      return res.status(404).json({ message: 'Survey not found or inactive' })
    }
    
    // Use existing respondent or create new one
    let finalRespondentId: number
    
    if (data.respondentId) {
      // Use existing respondent (created during tour lobby join)
      const existingRespondent = await prisma.respondent.findUnique({
        where: { id: data.respondentId },
      })
      if (!existingRespondent) {
        return res.status(400).json({ message: 'Respondent not found' })
      }
      finalRespondentId = data.respondentId
    } else if (data.respondent) {
      // Create new respondent
      const respondent = await prisma.respondent.create({
        data: {
          name: data.respondent.name,
          company: data.respondent.company,
          position: data.respondent.position || null,
          tourDate: new Date(data.respondent.tourDate),
          briefingCenterId: data.respondent.briefingCenterId,
        },
      })
      finalRespondentId = respondent.id
    } else {
      return res.status(400).json({ message: 'Either respondent or respondentId is required' })
    }
    
    // Create response
    const response = await prisma.response.create({
      data: {
        surveyId: data.surveyId,
        respondentId: finalRespondentId,
      },
    })
    
    // Get question types for sentiment calculation
    const questionMap = new Map<number, string>()
    for (const sq of survey.surveyQuestionnaires) {
      for (const q of sq.questionnaire.questions) {
        questionMap.set(q.id, q.type)
      }
    }
    
    // Create answers with sentiment scores
    const answers = data.answers.map(a => ({
      responseId: response.id,
      questionId: a.questionId,
      value: JSON.stringify(a.value),
      sentimentScore: calculateSentiment(questionMap.get(a.questionId) || 'text', a.value),
    }))
    
    await prisma.answer.createMany({ data: answers })
    
    res.status(201).json({ success: true, responseId: response.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// POST /api/responses/respondent - Create respondent early (for tour lobby)
router.post('/respondent', async (req, res) => {
  try {
    const data = respondentSchema.parse(req.body)
    
    const respondent = await prisma.respondent.create({
      data: {
        name: data.name,
        company: data.company,
        position: data.position || null,
        tourDate: new Date(data.tourDate),
        briefingCenterId: data.briefingCenterId,
      },
    })
    
    res.status(201).json({ respondent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// POST /api/responses/archive
router.post('/archive', authenticate, async (req, res) => {
  const { ids } = req.body as { ids: number[] }
  
  await prisma.response.updateMany({
    where: { id: { in: ids } },
    data: { isArchived: true },
  })
  
  res.json({ success: true })
})

// POST /api/responses/restore
router.post('/restore', authenticate, async (req, res) => {
  const { ids } = req.body as { ids: number[] }
  
  await prisma.response.updateMany({
    where: { id: { in: ids } },
    data: { isArchived: false },
  })
  
  res.json({ success: true })
})

export default router

