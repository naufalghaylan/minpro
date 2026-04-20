import { StatusOrder } from '@prisma/client';
import { z } from 'zod';

export const updateEventSchema = z
  .object({
    name: z.string().trim().min(1, 'Event name is required').max(255, 'Event name is too long').optional(),
    description: z.string().trim().optional().nullable(),
    price: z.number().int('Price must be integer').min(0, 'Price must be >= 0').optional(),
    totalSeats: z.number().int('Total seats must be integer').min(1, 'Total seats must be at least 1').optional(),
    eventDate: z.string().datetime().optional().nullable(),
    startTime: z.string().trim().min(1, 'Start time is required').optional().nullable(),
    endTime: z.string().trim().min(1, 'End time is required').optional().nullable(),
    location: z.string().trim().min(1, 'Location is required').optional().nullable(),
    city: z.string().trim().min(1, 'City is required').optional().nullable(),
    discountType: z.enum(['PERCENT', 'FIXED']).optional().nullable(),
    discountValue: z.number().int('Discount value must be integer').min(0, 'Discount value must be >= 0').optional().nullable(),
    discountStart: z.string().datetime().optional().nullable(),
    discountEnd: z.string().datetime().optional().nullable(),
  })
  .strict();

export const organizerTransactionQuerySchema = z.object({
  status: z.nativeEnum(StatusOrder).optional(),
  eventId: z.string().uuid('eventId must be a valid UUID').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const statisticsQuerySchema = z
  .object({
    groupBy: z.enum(['year', 'month', 'day']).default('month'),
    year: z.coerce.number().int().min(2000).max(3000).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.groupBy === 'month' && !value.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['year'],
        message: 'year is required when groupBy=month',
      });
    }

    if (value.groupBy === 'day' && (!value.year || !value.month)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['month'],
        message: 'year and month are required when groupBy=day',
      });
    }
  });

export const transactionDecisionSchema = z
  .object({
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(255, 'Reason is too long').optional(),
  })
  .strict();

export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type OrganizerTransactionQueryInput = z.infer<typeof organizerTransactionQuerySchema>;
export type StatisticsQueryInput = z.infer<typeof statisticsQuerySchema>;
export type TransactionDecisionInput = z.infer<typeof transactionDecisionSchema>;
