import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { comparePassword, generateToken } from '../lib/auth';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username este necesar'),
  password: z.string().min(1, 'Parola este necesară'),
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req, res: Response) => {
  try {
    // Validate request body
    const { username, password } = loginSchema.parse(req.body);

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({ error: 'Username sau parolă incorectă' });
      return;
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Username sau parolă incorectă' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Set token as httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user info (without password)
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      message: 'Autentificare reușită',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Eroare la autentificare' });
  }
});

/**
 * POST /api/auth/logout
 * Logout and clear cookie
 */
router.post('/logout', (req, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Deconectare reușită' });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Autentificare necesară' });
      return;
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilizator nu a fost găsit' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Eroare la obținerea datelor utilizatorului' });
  }
});

export default router;
