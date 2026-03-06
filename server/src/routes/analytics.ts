import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/analytics/summary
router.get('/summary', authenticate, async (req, res) => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const [
    totalResponses,
    responsesToday,
    responsesThisMonth,
    totalSurveys,
    totalQuestionnaires,
    avgSentimentData,
  ] = await Promise.all([
    prisma.response.count({ where: { isArchived: false } }),
    prisma.response.count({
      where: {
        completedAt: { gte: startOfDay },
        isArchived: false,
      },
    }),
    prisma.response.count({
      where: {
        completedAt: { gte: startOfMonth },
        isArchived: false,
      },
    }),
    prisma.survey.count({ where: { isActive: true } }),
    prisma.questionnaire.count(),
    prisma.answer.aggregate({
      _avg: { sentimentScore: true },
      where: {
        sentimentScore: { not: null },
        response: { isArchived: false },
      },
    }),
  ])
  
  res.json({
    summary: {
      totalResponses,
      responsesToday,
      responsesThisMonth,
      totalSurveys,
      totalQuestionnaires,
      avgSentiment: avgSentimentData._avg.sentimentScore,
    },
  })
})

// GET /api/analytics/aggregate
router.get('/aggregate', authenticate, async (req, res) => {
  const { group_by, date_range } = req.query as { group_by?: string; date_range?: string }
  
  // Calculate date filter
  let dateFilter: Date | undefined
  const now = new Date()
  
  switch (date_range) {
    case 'last_7_days':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'last_30_days':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'last_90_days':
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'this_year':
      dateFilter = new Date(now.getFullYear(), 0, 1)
      break
    default:
      dateFilter = undefined
  }
  
  const where: any = { isArchived: false }
  if (dateFilter) {
    where.completedAt = { gte: dateFilter }
  }
  
  let data: any[] = []
  
  switch (group_by) {
    case 'briefing_center':
      const centerResults = await prisma.response.groupBy({
        by: ['surveyId'],
        where,
        _count: true,
      })
      
      // Get center info for each survey
      const surveyIds = centerResults.map(r => r.surveyId)
      const surveys = await prisma.survey.findMany({
        where: { id: { in: surveyIds } },
        include: { briefingCenter: true },
      })
      
      const centerMap = new Map<string, { count: number; sentimentSum: number; sentimentCount: number }>()
      
      for (const result of centerResults) {
        const survey = surveys.find(s => s.id === result.surveyId)
        if (survey) {
          const centerCode = survey.briefingCenter.code
          const existing = centerMap.get(centerCode) || { count: 0, sentimentSum: 0, sentimentCount: 0 }
          existing.count += result._count
          centerMap.set(centerCode, existing)
        }
      }
      
      data = Array.from(centerMap.entries()).map(([code, stats]) => ({
        label: code,
        count: stats.count,
        avgSentiment: null, // Simplified for SQLite
      }))
      break
    
    case 'tour_type':
      const typeResults = await prisma.response.groupBy({
        by: ['surveyId'],
        where,
        _count: true,
      })
      
      const typeSurveyIds = typeResults.map(r => r.surveyId)
      const typeSurveys = await prisma.survey.findMany({
        where: { id: { in: typeSurveyIds } },
        include: { tourType: true },
      })
      
      const typeMap = new Map<string, number>()
      
      for (const result of typeResults) {
        const survey = typeSurveys.find(s => s.id === result.surveyId)
        if (survey) {
          const typeName = survey.tourType.name
          typeMap.set(typeName, (typeMap.get(typeName) || 0) + result._count)
        }
      }
      
      data = Array.from(typeMap.entries()).map(([name, count]) => ({
        label: name,
        count,
        avgSentiment: null, // Could add sentiment calculation here
      }))
      break
    
    case 'date':
      // Group by date (day) - simplified for SQLite compatibility
      const dateResponses = await prisma.response.findMany({
        where,
        include: {
          answers: {
            select: { sentimentScore: true },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 100,
      })
      
      const dateMap = new Map<string, { count: number; sentimentSum: number; sentimentCount: number }>()
      for (const r of dateResponses) {
        const dateKey = r.completedAt.toISOString().split('T')[0]
        const existing = dateMap.get(dateKey) || { count: 0, sentimentSum: 0, sentimentCount: 0 }
        existing.count++
        for (const a of r.answers) {
          if (a.sentimentScore !== null) {
            existing.sentimentSum += a.sentimentScore
            existing.sentimentCount++
          }
        }
        dateMap.set(dateKey, existing)
      }
      
      data = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, stats]) => ({
          label: new Date(date).toLocaleDateString(),
          count: stats.count,
          avgSentiment: stats.sentimentCount > 0 ? stats.sentimentSum / stats.sentimentCount : null,
        }))
      break
    
    case 'questionnaire':
      const questionnaireResults = await prisma.answer.groupBy({
        by: ['questionId'],
        where: {
          response: where,
        },
        _count: true,
        _avg: { sentimentScore: true },
      })
      
      const questionIds = questionnaireResults.map(r => r.questionId)
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: { questionnaire: true },
      })
      
      const qMap = new Map<string, { count: number; sentimentSum: number; sentimentCount: number }>()
      
      for (const result of questionnaireResults) {
        const question = questions.find(q => q.id === result.questionId)
        if (question) {
          const qTitle = question.questionnaire.title
          const existing = qMap.get(qTitle) || { count: 0, sentimentSum: 0, sentimentCount: 0 }
          existing.count += result._count
          if (result._avg.sentimentScore) {
            existing.sentimentSum += result._avg.sentimentScore * result._count
            existing.sentimentCount += result._count
          }
          qMap.set(qTitle, existing)
        }
      }
      
      data = Array.from(qMap.entries()).map(([title, stats]) => ({
        label: title,
        count: stats.count,
        avgSentiment: stats.sentimentCount > 0 
          ? stats.sentimentSum / stats.sentimentCount 
          : null,
      }))
      break
    
    default:
      // Default: count by month - simplified for SQLite
      const defaultResponses = await prisma.response.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        take: 500,
      })
      
      const monthMap = new Map<string, number>()
      for (const r of defaultResponses) {
        const monthKey = r.completedAt.toISOString().slice(0, 7) // YYYY-MM
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1)
      }
      
      data = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, count]) => ({
          label: month,
          count,
          avgSentiment: null,
        }))
  }
  
  res.json({ data })
})

export default router

