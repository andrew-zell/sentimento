import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js'

const router = Router()

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'editor', 'viewer']),
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
})

// GET /api/users
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ users })
})

// POST /api/users
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body)
    
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' })
    }
    
    const passwordHash = await bcrypt.hash(data.password, 10)
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })
    
    res.status(201).json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// PATCH /api/users/:id
router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const data = updateUserSchema.parse(req.body)
    
    const updateData: any = { ...data }
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10)
      delete updateData.password
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })
    
    res.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    throw error
  }
})

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  
  if (req.user?.id === id) {
    return res.status(400).json({ message: 'Cannot delete yourself' })
  }
  
  await prisma.user.delete({ where: { id } })
  res.json({ success: true })
})

export default router

