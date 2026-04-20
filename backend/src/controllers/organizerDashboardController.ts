import type { Response } from 'express';
import { AppError } from '../errors/app.error';
import type { AuthRequest } from '../types/auth';
import {
  decideOrganizerTransaction,
  getDashboardOverview,
  getEventAttendees,
  getOrganizerEvents,
  getOrganizerStatistics,
  getOrganizerTransactions,
  updateOrganizerEvent,
} from '../services/organizerDashboardService';
import {
  organizerTransactionQuerySchema,
  statisticsQuerySchema,
  transactionDecisionSchema,
} from '../validations/organizerDashboardValidation';

const handleError = (res: Response, error: unknown) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
};

const requireOrganizerAuth = (req: AuthRequest) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  return req.user.id;
};

export const getOrganizerDashboardOverview = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const overview = await getDashboardOverview(organizerId);

    return res.status(200).json({
      message: 'Dashboard overview fetched successfully',
      data: overview,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listOrganizerEvents = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const events = await getOrganizerEvents(organizerId);

    return res.status(200).json({
      message: 'Organizer events fetched successfully',
      data: events,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const patchOrganizerEvent = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const eventIdParam = req.params.eventId;
    const eventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam;

    if (!eventId) {
      throw new AppError(400, 'eventId is required');
    }

    const event = await updateOrganizerEvent(organizerId, eventId, req.body);

    return res.status(200).json({
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listOrganizerTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const query = organizerTransactionQuerySchema.parse(req.query);
    const result = await getOrganizerTransactions(organizerId, query);

    return res.status(200).json({
      message: 'Organizer transactions fetched successfully',
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const acceptOrganizerTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const transactionIdParam = req.params.transactionId;
    const transactionId = Array.isArray(transactionIdParam) ? transactionIdParam[0] : transactionIdParam;

    if (!transactionId) {
      throw new AppError(400, 'transactionId is required');
    }

    const decisionPayload = transactionDecisionSchema.parse(req.body ?? {});
    const result = await decideOrganizerTransaction(organizerId, transactionId, 'accept', decisionPayload);

    return res.status(200).json({
      message: 'Transaction accepted successfully',
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const rejectOrganizerTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const transactionIdParam = req.params.transactionId;
    const transactionId = Array.isArray(transactionIdParam) ? transactionIdParam[0] : transactionIdParam;

    if (!transactionId) {
      throw new AppError(400, 'transactionId is required');
    }

    const decisionPayload = transactionDecisionSchema.parse(req.body ?? {});
    const result = await decideOrganizerTransaction(organizerId, transactionId, 'reject', decisionPayload);

    return res.status(200).json({
      message: 'Transaction rejected successfully',
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getOrganizerStatisticsReport = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const query = statisticsQuerySchema.parse(req.query);
    const result = await getOrganizerStatistics(organizerId, query);

    return res.status(200).json({
      message: 'Organizer statistics fetched successfully',
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getOrganizerAttendeeList = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = requireOrganizerAuth(req);
    const eventIdParam = req.params.eventId;
    const eventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam;

    if (!eventId) {
      throw new AppError(400, 'eventId is required');
    }

    const attendees = await getEventAttendees(organizerId, eventId);

    return res.status(200).json({
      message: 'Attendee list fetched successfully',
      data: attendees,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
