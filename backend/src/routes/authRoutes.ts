import { Router } from 'express';
import { RoleType } from '@prisma/client';
import { getMe, login, register } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleGuard } from '../middlewares/roleGuard';
import { validateBody } from '../middlewares/validateRequest';
import { loginSchema, registerSchema } from '../validations/authValidation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

// Example JWT-protected endpoint
router.get('/me', authMiddleware, getMe);

// Example role-protected endpoint for event organizer
router.get(
	'/organizer-dashboard',
	authMiddleware,
	roleGuard([RoleType.EVENT_ORGANIZER]),
	(req, res) => {
		return res.status(200).json({ message: 'Welcome organizer dashboard' });
	},
);

export default router;
