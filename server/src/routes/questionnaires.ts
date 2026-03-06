import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js'

const router = Router()

const questionSchema = z.object({
  id: z.number().optional(),
  text: z.string().min(1),
  type: z.enum(['multiple_choice', 'emoji', 'multi_select', 'text']),
  options: z.any(),
  isRequired: z.boolean().default(false),
  order: z.number().default(0),
})

const createQuestionnaireSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  isFollowAlong: z.boolean().default(false),
  isHostLed: z.boolean().default(false),
  questions: z.array(questionSchema).default([]),
})

// Helper to parse question options
function parseQuestionOptions(questions: any[]) {
  return questions.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null,
  }))
}

// GET /api/questionnaires
router.get('/', async (req, res) => {
  const questionnaires = await prisma.questionnaire.findMany({
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { surveyQuestionnaires: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  
  // Parse JSON options for each question
  const result = questionnaires.map(q => ({
    ...q,
    questions: parseQuestionOptions(q.questions),
  }))
  
  res.json({ questionnaires: result })
})

// GET /api/questionnaires/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })
  
  if (!questionnaire) {
    return res.status(404).json({ message: 'Questionnaire not found' })
  }
  
  // Parse JSON options
  const result = {
    ...questionnaire,
    questions: parseQuestionOptions(questionnaire.questions),
  }
  
  res.json({ questionnaire: result })
})

// POST /api/questionnaires
router.post('/', authenticate, authorize('admin', 'editor'), async (req: AuthRequest, res) => {
  try {
    const data = createQuestionnaireSchema.parse(req.body)
    
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: data.title,
        description: data.description,
        isFollowAlong: data.isFollowAlong,
        isHostLed: data.isHostLed,
        createdById: req.user!.id,
        questions: {
          create: data.questions.map((q, index) => ({
            text: q.text,
            type: q.type,
            options: q.options ? JSON.stringify(q.options) : null,
            isRequired: q.isRequired,
            order: q.order ?? index,
            createdById: req.user!.id,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })
    
    // Parse JSON options for response
    const result = {
      ...questionnaire,
      questions: parseQuestionOptions(questionnaire.questions),
    }
    
    res.status(201).json({ questionnaire: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// PATCH /api/questionnaires/:id
router.patch('/:id', authenticate, authorize('admin', 'editor'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const data = createQuestionnaireSchema.partial().parse(req.body)
    
    // Update questionnaire
    await prisma.questionnaire.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isFollowAlong: data.isFollowAlong,
        isHostLed: data.isHostLed,
      },
    })
    
    // Update questions if provided
    if (data.questions) {
      // Delete removed questions
      const existingQuestionIds = data.questions
        .filter(q => q.id)
        .map(q => q.id!)
      
      await prisma.question.deleteMany({
        where: {
          questionnaireId: id,
          id: { notIn: existingQuestionIds },
        },
      })
      
      // Upsert questions
      for (const q of data.questions) {
        if (q.id) {
          await prisma.question.update({
            where: { id: q.id },
            data: {
              text: q.text,
              type: q.type,
              options: q.options ? JSON.stringify(q.options) : null,
              isRequired: q.isRequired,
              order: q.order,
            },
          })
        } else {
          await prisma.question.create({
            data: {
              questionnaireId: id,
              text: q.text,
              type: q.type,
              options: q.options ? JSON.stringify(q.options) : null,
              isRequired: q.isRequired,
              order: q.order,
              createdById: req.user!.id,
            },
          })
        }
      }
    }
    
    // Fetch updated questionnaire with questions
    const updated = await prisma.questionnaire.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })
    
    // Parse JSON options
    const result = updated ? {
      ...updated,
      questions: parseQuestionOptions(updated.questions),
    } : null
    
    res.json({ questionnaire: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// DELETE /api/questionnaires/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = parseInt(req.params.id)
  await prisma.questionnaire.delete({ where: { id } })
  res.json({ success: true })
})

export default router

