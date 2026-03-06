import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /api/briefing-centers
router.get('/', async (req, res) => {
  const centers = await prisma.briefingCenter.findMany({
    orderBy: { name: 'asc' },
  })
  res.json({ centers })
})

export default router

