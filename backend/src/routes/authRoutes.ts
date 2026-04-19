import { Router } from 'express';
import { RoleType } from '@prisma/client';
import { changePassword, forgotPassword, getMe, getWalletAndCoupons, login, register, resetPassword, updateProfile, updateProfilePicture } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { profileImageUpload } from '../middlewares/profileImageUpload';
import { roleGuard } from '../middlewares/roleGuard';
import { validateBody } from '../middlewares/validateRequest';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, updateProfileSchema } from '../validations/authValidation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

// Example JWT-protected endpoint
router.get('/me', authMiddleware, getMe);
router.patch('/profile', authMiddleware, validateBody(updateProfileSchema), updateProfile);
router.patch('/profile/picture', authMiddleware, profileImageUpload, updateProfilePicture);
router.patch('/change-password', authMiddleware, validateBody(changePasswordSchema), changePassword);
router.get('/wallet-and-coupons', authMiddleware, getWalletAndCoupons);

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
