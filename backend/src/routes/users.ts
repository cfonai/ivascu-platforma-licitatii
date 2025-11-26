import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3, 'Username trebuie să aibă minim 3 caractere'),
  email: z.string().email('Email invalid'),
  password: z.string().min(6, 'Parola trebuie să aibă minim 6 caractere'),
  role: z.enum(['client', 'supplier'], {
    errorMap: () => ({ message: 'Rolul trebuie să fie client sau supplier' }),
  }),
});

/**
 * POST /api/users
 * Create a new user (Admin only)
 */
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const { username, email, password, role } = createUserSchema.parse(req.body);

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Username-ul există deja' });
      return;
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      res.status(400).json({ error: 'Email-ul există deja' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
        createdBy: req.user!.userId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      user,
      message: 'Utilizator creat cu succes',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Eroare la crearea utilizatorului' });
  }
});

/**
 * GET /api/users
 * Get all users (Admin only)
 */
router.get('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Eroare la obținerea utilizatorilor' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID (Admin only)
 */
router.get('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        createdBy: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilizatorul nu a fost găsit' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Eroare la obținerea utilizatorului' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilizatorul nu a fost găsit' });
      return;
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      res.status(403).json({ error: 'Nu poți șterge un administrator' });
      return;
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'Utilizator șters cu succes' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Eroare la ștergerea utilizatorului' });
  }
});

export default router;
