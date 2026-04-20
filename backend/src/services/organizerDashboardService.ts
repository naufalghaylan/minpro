import { Prisma, StatusOrder } from '@prisma/client';
import { AppError } from '../errors/app.error';
import { prisma } from '../configs/prisma';
import { sendTransactionStatusEmail } from './emailService';
import type {
  OrganizerTransactionQueryInput,
  StatisticsQueryInput,
  TransactionDecisionInput,
  UpdateEventInput,
} from '../validations/organizerDashboardValidation';

const REWARD_EXPIRATION_MONTHS = 3;

const getRewardExpirationDate = () => {
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + REWARD_EXPIRATION_MONTHS);
  return expirationDate;
};

const getPaymentProofUrl = (paymentProof: string | null) => {
  if (!paymentProof) {
    return null;
  }

  const backendBaseUrl = process.env.BACKEND_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;
  return `${backendBaseUrl}/uploads/${paymentProof}`;
};

const ensureOrganizerOwnsEvent = async (organizerId: string, eventId: string) => {
  const event = await prisma.events.findFirst({
    where: {
      id: eventId,
      eventOrganizerId: organizerId,
    },
    select: {
      id: true,
      totalSeats: true,
      availableSeats: true,
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found or not owned by organizer');
  }

  return event;
};

export const getDashboardOverview = async (organizerId: string) => {
  const [eventCount, paidPendingCount, doneCount, revenueAggregate] = await Promise.all([
    prisma.events.count({
      where: {
        eventOrganizerId: organizerId,
      },
    }),
    prisma.transaction.count({
      where: {
        status: StatusOrder.PAID,
        order: {
          event: {
            eventOrganizerId: organizerId,
          },
        },
      },
    }),
    prisma.transaction.count({
      where: {
        status: StatusOrder.DONE,
        order: {
          event: {
            eventOrganizerId: organizerId,
          },
        },
      },
    }),
    prisma.orders.aggregate({
      where: {
        transaction: {
          status: StatusOrder.DONE,
        },
        event: {
          eventOrganizerId: organizerId,
        },
      },
      _sum: {
        totalAmount: true,
        quantity: true,
      },
    }),
  ]);

  return {
    totalEvents: eventCount,
    pendingPaymentVerifications: paidPendingCount,
    completedTransactions: doneCount,
    totalTicketsSold: revenueAggregate._sum.quantity ?? 0,
    totalRevenue: revenueAggregate._sum.totalAmount ?? 0,
  };
};

export const getOrganizerEvents = async (organizerId: string) => {
  return prisma.events.findMany({
    where: {
      eventOrganizerId: organizerId,
    },
    include: {
      event_images: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const updateOrganizerEvent = async (
  organizerId: string,
  eventId: string,
  payload: UpdateEventInput,
) => {
  const existingEvent = await ensureOrganizerOwnsEvent(organizerId, eventId);

  const reservedSeats = existingEvent.totalSeats - existingEvent.availableSeats;
  const requestedTotalSeats = payload.totalSeats ?? existingEvent.totalSeats;

  if (requestedTotalSeats < reservedSeats) {
    throw new AppError(
      400,
      `Total seats cannot be below already reserved seats (${reservedSeats}).`,
    );
  }

  const updatedEvent = await prisma.events.update({
    where: {
      id: eventId,
    },
    data: {
      name: payload.name,
      description: payload.description === undefined ? undefined : payload.description,
      price: payload.price,
      totalSeats: payload.totalSeats,
      availableSeats:
        payload.totalSeats === undefined
          ? undefined
          : requestedTotalSeats - reservedSeats,
      eventDate: payload.eventDate ? new Date(payload.eventDate) : payload.eventDate === null ? null : undefined,
      startTime: payload.startTime === undefined ? undefined : payload.startTime,
      endTime: payload.endTime === undefined ? undefined : payload.endTime,
      location: payload.location === undefined ? undefined : payload.location,
      city: payload.city === undefined ? undefined : payload.city,
      discountType: payload.discountType === undefined ? undefined : payload.discountType,
      discountValue: payload.discountValue === undefined ? undefined : payload.discountValue,
      discountStart:
        payload.discountStart === undefined
          ? undefined
          : payload.discountStart === null
            ? null
            : new Date(payload.discountStart),
      discountEnd:
        payload.discountEnd === undefined
          ? undefined
          : payload.discountEnd === null
            ? null
            : new Date(payload.discountEnd),
    },
    include: {
      event_images: true,
    },
  });

  return updatedEvent;
};

export const getOrganizerTransactions = async (
  organizerId: string,
  query: OrganizerTransactionQueryInput,
) => {
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.transactionWhereInput = {
    status: query.status,
    order: {
      event: {
        eventOrganizerId: organizerId,
        id: query.eventId,
      },
    },
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                city: true,
                eventDate: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: query.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions.map((transaction) => ({
      ...transaction,
      paymentProofUrl: getPaymentProofUrl(transaction.paymentProof),
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

type StatsRow = {
  bucket: number;
  transactionCount: bigint;
  ticketsSold: bigint;
  revenue: number;
};

export const getOrganizerStatistics = async (
  organizerId: string,
  query: StatisticsQueryInput,
) => {
  let rows: StatsRow[] = [];

  if (query.groupBy === 'year') {
    rows = await prisma.$queryRaw<StatsRow[]>`
      SELECT
        EXTRACT(YEAR FROM t."createdAt")::int AS "bucket",
        COUNT(*)::bigint AS "transactionCount",
        COALESCE(SUM(o."quantity"), 0)::bigint AS "ticketsSold",
        COALESCE(SUM(o."totalAmount"), 0)::float8 AS "revenue"
      FROM "transaction" t
      INNER JOIN "orders" o ON o."transactionId" = t."id"
      INNER JOIN "events" e ON e."id" = o."eventId"
      WHERE e."eventOrganizerId" = ${organizerId}
        AND t."status" = 'DONE'
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  if (query.groupBy === 'month') {
    rows = await prisma.$queryRaw<StatsRow[]>`
      SELECT
        EXTRACT(MONTH FROM t."createdAt")::int AS "bucket",
        COUNT(*)::bigint AS "transactionCount",
        COALESCE(SUM(o."quantity"), 0)::bigint AS "ticketsSold",
        COALESCE(SUM(o."totalAmount"), 0)::float8 AS "revenue"
      FROM "transaction" t
      INNER JOIN "orders" o ON o."transactionId" = t."id"
      INNER JOIN "events" e ON e."id" = o."eventId"
      WHERE e."eventOrganizerId" = ${organizerId}
        AND t."status" = 'DONE'
        AND EXTRACT(YEAR FROM t."createdAt") = ${query.year as number}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  if (query.groupBy === 'day') {
    rows = await prisma.$queryRaw<StatsRow[]>`
      SELECT
        EXTRACT(DAY FROM t."createdAt")::int AS "bucket",
        COUNT(*)::bigint AS "transactionCount",
        COALESCE(SUM(o."quantity"), 0)::bigint AS "ticketsSold",
        COALESCE(SUM(o."totalAmount"), 0)::float8 AS "revenue"
      FROM "transaction" t
      INNER JOIN "orders" o ON o."transactionId" = t."id"
      INNER JOIN "events" e ON e."id" = o."eventId"
      WHERE e."eventOrganizerId" = ${organizerId}
        AND t."status" = 'DONE'
        AND EXTRACT(YEAR FROM t."createdAt") = ${query.year as number}
        AND EXTRACT(MONTH FROM t."createdAt") = ${query.month as number}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  const series = rows.map((row) => ({
    bucket: Number(row.bucket),
    transactionCount: Number(row.transactionCount),
    ticketsSold: Number(row.ticketsSold),
    revenue: Number(row.revenue),
  }));

  return {
    groupBy: query.groupBy,
    year: query.year ?? null,
    month: query.month ?? null,
    series,
  };
};

export const getEventAttendees = async (organizerId: string, eventId: string) => {
  await ensureOrganizerOwnsEvent(organizerId, eventId);

  const attendees = await prisma.orders.findMany({
    where: {
      eventId,
      transaction: {
        status: StatusOrder.DONE,
      },
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      transaction: {
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return attendees.map((order) => ({
    transactionId: order.transactionId,
    customerId: order.customerId,
    customerName: order.users.name,
    customerEmail: order.users.email,
    ticketQuantity: order.quantity,
    totalPricePaid: order.totalAmount,
    purchasedAt: order.createdAt,
  }));
};

const rollbackRewardsForRejectedTransaction = async (
  tx: Prisma.TransactionClient,
  transactionRecord: any,
) => {
  const rewardExpiresAt = getRewardExpirationDate();

  if (transactionRecord.walletAmountUsed > 0) {
    await tx.wallets.upsert({
      where: {
        userId: transactionRecord.userId,
      },
      create: {
        userId: transactionRecord.userId,
        balance: transactionRecord.walletAmountUsed,
        expiresAt: rewardExpiresAt,
      },
      update: {
        balance: {
          increment: transactionRecord.walletAmountUsed,
        },
        expiresAt: rewardExpiresAt,
        usedAt: null,
      },
    });
  }

  if (transactionRecord.couponCodeUsed) {
    await tx.coupons.updateMany({
      where: {
        userId: transactionRecord.userId,
        code: transactionRecord.couponCodeUsed,
      },
      data: {
        usedAt: null,
        expiresAt: rewardExpiresAt,
      },
    });
  }

  if (transactionRecord.voucherCodeUsed) {
    await tx.vouchers.updateMany({
      where: {
        code: transactionRecord.voucherCodeUsed,
        used: {
          gt: 0,
        },
      },
      data: {
        used: {
          decrement: 1,
        },
      },
    });
  }

  if (transactionRecord.order) {
    await tx.events.update({
      where: {
        id: transactionRecord.order.eventId,
      },
      data: {
        availableSeats: {
          increment: transactionRecord.order.quantity,
        },
      },
    });
  }
};

export const decideOrganizerTransaction = async (
  organizerId: string,
  transactionId: string,
  action: 'accept' | 'reject',
  payload?: TransactionDecisionInput,
) => {
  const decisionNote = payload?.reason ?? null;
  const nextStatus = action === 'accept' ? StatusOrder.DONE : StatusOrder.REJECTED;

  const transactionRecord = await prisma.$transaction(async (tx) => {
    const existing = (await tx.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                eventOrganizerId: true,
              },
            },
          },
        },
      },
    })) as any;

    if (!existing) {
      throw new AppError(404, 'Transaction not found');
    }

    if (!existing.order || existing.order.event.eventOrganizerId !== organizerId) {
      throw new AppError(403, 'Transaction is not part of your event');
    }

    if (existing.status !== StatusOrder.PAID) {
      throw new AppError(400, 'Only PAID transactions can be accepted or rejected');
    }

    if (action === 'reject') {
      await rollbackRewardsForRejectedTransaction(tx, existing);
    }

    const updated = await tx.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        status: nextStatus,
        decisionNote,
        decisionAt: new Date(),
      } as any,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return updated;
  });

  await sendTransactionStatusEmail({
    emailTo: transactionRecord.user.email,
    name: transactionRecord.user.name,
    eventName: transactionRecord.order?.event?.name ?? 'Unknown event',
    status: action === 'accept' ? 'ACCEPTED' : 'REJECTED',
    transactionId: transactionRecord.id,
    totalAmount: transactionRecord.totalAmount,
    reason: decisionNote ?? undefined,
  });

  return {
    ...transactionRecord,
    paymentProofUrl: getPaymentProofUrl(transactionRecord.paymentProof),
  };
};
