import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Helper to parse question options in survey response
function parseSurveyQuestionOptions(survey: any) {
  if (!survey?.surveyQuestionnaires) return survey
  return {
    ...survey,
    surveyQuestionnaires: survey.surveyQuestionnaires.map((sq: any) => ({
      ...sq,
      questionnaire: {
        ...sq.questionnaire,
        questions: sq.questionnaire.questions?.map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
        })) || [],
      },
    })),
  }
}

const surveyQuestionnaireSchema = z.object({
  questionnaireId: z.number(),
  order: z.number(),
})

const createSurveySchema = z.object({
  title: z.string().min(1),
  briefingCenterId: z.number(),
  tourTypeId: z.number(),
  isActive: z.boolean().default(true),
  themeConfig: z.string().optional().nullable(),
  questionnaires: z.array(surveyQuestionnaireSchema).default([]),
})

// GET /api/surveys
router.get('/', async (req, res) => {
  const surveys = await prisma.survey.findMany({
    include: {
      briefingCenter: true,
      tourType: true,
      surveyQuestionnaires: {
        include: {
          questionnaire: {
            include: {
              questions: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { responses: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ surveys: surveys.map(parseSurveyQuestionOptions) })
})

// GET /api/surveys/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      briefingCenter: true,
      tourType: true,
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
  })
  
  if (!survey) {
    return res.status(404).json({ message: 'Survey not found' })
  }
  
  res.json({ survey: parseSurveyQuestionOptions(survey) })
})

// GET /api/surveys/route/:centerCode/:tourType - Public route for survey taking
router.get('/route/:centerCode/:tourType', async (req, res) => {
  const { centerCode, tourType } = req.params
  
  const center = await prisma.briefingCenter.findUnique({
    where: { code: centerCode.toUpperCase() },
  })
  
  if (!center) {
    return res.status(404).json({ message: 'Briefing center not found' })
  }
  
  const type = await prisma.tourType.findUnique({
    where: { slug: tourType.toLowerCase() },
  })
  
  if (!type) {
    return res.status(404).json({ message: 'Tour type not found' })
  }
  
  const survey = await prisma.survey.findFirst({
    where: {
      briefingCenterId: center.id,
      tourTypeId: type.id,
      isActive: true,
    },
    include: {
      briefingCenter: true,
      tourType: true,
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
  })
  
  if (!survey) {
    return res.status(404).json({ message: 'No active survey found for this route' })
  }
  
  res.json({ survey: parseSurveyQuestionOptions(survey) })
})

// POST /api/surveys
router.post('/', authenticate, authorize('admin', 'editor'), async (req: AuthRequest, res) => {
  try {
    const data = createSurveySchema.parse(req.body)
    
    const survey = await prisma.survey.create({
      data: {
        title: data.title,
        briefingCenterId: data.briefingCenterId,
        tourTypeId: data.tourTypeId,
        isActive: data.isActive,
        themeConfig: data.themeConfig ?? null,
        createdById: req.user!.id,
        surveyQuestionnaires: {
          create: data.questionnaires.map(q => ({
            questionnaireId: q.questionnaireId,
            order: q.order,
          })),
        },
      },
      include: {
        briefingCenter: true,
        tourType: true,
        surveyQuestionnaires: {
          include: {
            questionnaire: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })
    
    res.status(201).json({ survey })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// PATCH /api/surveys/:id
router.patch('/:id', authenticate, authorize('admin', 'editor'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const data = createSurveySchema.partial().parse(req.body)
    
    // Update survey
    await prisma.survey.update({
      where: { id },
      data: {
        title: data.title,
        briefingCenterId: data.briefingCenterId,
        tourTypeId: data.tourTypeId,
        isActive: data.isActive,
        ...(data.themeConfig !== undefined ? { themeConfig: data.themeConfig } : {}),
      },
    })
    
    // Update questionnaires if provided
    if (data.questionnaires) {
      // Delete existing and recreate
      await prisma.surveyQuestionnaire.deleteMany({
        where: { surveyId: id },
      })
      
      await prisma.surveyQuestionnaire.createMany({
        data: data.questionnaires.map(q => ({
          surveyId: id,
          questionnaireId: q.questionnaireId,
          order: q.order,
        })),
      })
    }
    
    // Fetch updated survey
    const updated = await prisma.survey.findUnique({
      where: { id },
      include: {
        briefingCenter: true,
        tourType: true,
        surveyQuestionnaires: {
          include: {
            questionnaire: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })
    
    res.json({ survey: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// DELETE /api/surveys/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = parseInt(req.params.id)
  await prisma.survey.delete({ where: { id } })
  res.json({ success: true })
})

export default router

