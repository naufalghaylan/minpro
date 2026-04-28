import { RoleType } from '@prisma/client';
import { Router } from 'express';
import {
  acceptOrganizerTransaction,
  getOrganizerAttendeeList,
  getOrganizerDashboardOverview,
  getOrganizerStatisticsReport,
  listOrganizerEvents,
  listOrganizerTransactions,
  patchOrganizerEvent,
  rejectOrganizerTransaction,
} from '../controllers/organizerDashboardController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleGuard } from '../middlewares/roleGuard';
import { validateBody } from '../middlewares/validateRequest';
import { updateEventSchema } from '../validations/organizerDashboardValidation';

const router = Router();

router.use(authMiddleware, roleGuard([RoleType.EVENT_ORGANIZER]));

router.get('/overview', getOrganizerDashboardOverview);
router.get('/events', listOrganizerEvents);
router.patch('/events/:eventId', validateBody(updateEventSchema), patchOrganizerEvent);
router.get('/transactions', listOrganizerTransactions);
router.post('/transactions/:transactionId/accept', acceptOrganizerTransaction);
router.post('/transactions/:transactionId/reject', rejectOrganizerTransaction);
router.get('/statistics', getOrganizerStatisticsReport);
router.get('/events/:eventId/attendees', getOrganizerAttendeeList);

export default router;
