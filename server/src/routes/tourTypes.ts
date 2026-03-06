import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /api/tour-types
router.get('/', async (req, res) => {
  const tourTypes = await prisma.tourType.findMany({
    orderBy: { name: 'asc' },
  })
  res.json({ tourTypes })
})

export default router

