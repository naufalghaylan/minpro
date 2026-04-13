import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import cron from 'node-cron';
import authRoutes from './src/routes/authRoutes';
import { AppError } from './src/errors/app.error';
import { prisma } from './src/configs/prisma';
import { th } from 'zod/locales';


import { startRewardExpirationCron } from './src/cron/rewardExpirationCron';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });
// ==================
// MIDDLEWARE
// ==================
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ==================
// ROOT
// ==================
app.get('/', (_req: Request, res: Response) => {
  return res.send('API is running 🚀');
});

// ==================
// USERS
// ==================
app.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      referralCode: true,
      referredBy: true,
    },
  });

  return res.status(200).json(users);
});

// ==================
// EVENTS
// ==================

// 🔍 GET ALL EVENTS
app.get('/events', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;

    const data = await prisma.events.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {},
      include: {
        users: {
          select: { name: true },
        },
        event_images: true,
      },
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching events',
      error: error.message,
    });
  }
});

app.get('/events/:id', async (req: Request, res: Response) => {
  try {
const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    const event = await prisma.events.findUnique({
      where: { id },
      include: {
        event_images: true,
        users: {
          select: { name: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching event detail',
      error: error.message,
    });
  }
});

// ➕ CREATE EVENT
app.post('/events', async (req: Request, res: Response) => {
  try {
    const { name, price, totalSeats, eventOrganizerId, images } = req.body;

    if (!name || !price || !totalSeats || !eventOrganizerId) {
      return res.status(400).json({
        message: 'Semua field wajib diisi',
      });
    }

    const newEvent = await prisma.events.create({
      data: {
        name,
        price: Number(price),
        totalSeats: Number(totalSeats),
        availableSeats: Number(totalSeats),
        eventOrganizerId,

        event_images: {
          create:
            images?.map((url: string) => ({
              url,
            })) || [],
        },
      },
      include: {
        event_images: true,
        users: {
          select: { name: true },
        },
      },
    });

    res.status(201).json({
      message: 'Event berhasil dibuat',
      data: newEvent,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'Nama event sudah digunakan',
      });
    }

    res.status(500).json({
      message: 'Error creating event',
      error: error.message,
    });
  }
});

// ==================
// ORDERS
// ==================

// ➕ CREATE ORDER:id
app.post('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { customerId, eventId, quantity } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.events.findUnique({
        where: { id: eventId },
      });

      if (!event) throw new Error('Event not found');

      if (event.availableSeats < quantity) {
        throw new Error('Seat tidak cukup');
      }

      const totalAmount = event.price * quantity;

      const order = await tx.orders.create({
        data: {
          customerId,
          eventId,
          quantity: Number(quantity),
          totalAmount,
        },
      });

      await tx.events.update({
        where: { id: eventId },
        data: {
          availableSeats: {
            decrement: Number(quantity),
          },
        },
      });

      return order;
    }, {
    timeout: 10000,
  });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
});
// create order tanpa :id
app.post('/orders', async (req: Request, res: Response) => {
  try {
    const { customerId, eventId, quantity } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.events.findUnique({
        where: { id: eventId },
      });

      if (!event) throw new Error('Event not found');

      if (event.availableSeats < quantity) {
        throw new Error('Seat tidak cukup');
      }

      const totalAmount = event.price * quantity;

      const order = await tx.orders.create({
        data: {
          customerId,
          eventId,
          quantity: Number(quantity),
          totalAmount,
        },
      });

      await tx.events.update({
        where: { id: eventId },
        data: {
          availableSeats: {
            decrement: Number(quantity),
          },
        },
      });

      return order;
    }, {
    timeout: 10000,
  });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
});
// 🔍 GET ORDERS
app.get('/orders', async (_req: Request, res: Response) => {
  const data = await prisma.orders.findMany({
    include: {
      users: true,
      event: true,
    },
  });

  res.json(data);
});
// ==================
// TRANSACTIONS
// ==================

// ➕ CREATE TRANSACTION (AUTO PENDING)
app.post('/transactions', async (req: Request, res: Response) => {
  try {
    const { ordersId } = req.body;

    const order = await prisma.orders.findUnique({
      where: { id: ordersId },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const transaction = await prisma.transaction.create({
  data: {
    userId: order.customerId,
    ordersId: order.id,
    totalAmount: order.totalAmount,
    status: 'PENDING',
  },
});

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error creating transaction',
      error: error.message,
    });
  }
});


// 📤 UPLOAD PAYMENT PROOF → PAID
app.post(
  '/transactions/:id/upload',
  upload.single('paymentProof'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError(400, 'Transaction ID is required');
      }

      const trx = await prisma.transaction.findUnique({
        where: { id  : id as string }
        ,
      });

      if (!trx) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      if (trx.status !== 'PENDING') {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const updated = await prisma.transaction.update({
        where: { id : id as string },
        data: {
          paymentProof: req.file?.filename,
          status: 'PAID',
        },
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({
        message: 'Upload failed',
        error: error.message,
      });
    }
  }
);


// ❌ CANCEL TRANSACTION → BALIKIN SEAT
app.post('/transactions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trx = await prisma.transaction.findUnique({
      where: { id : id as string },
      include: { order: true },
    });

    if (!trx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (trx.status !== 'PENDING') {
      return res.status(400).json({ message: 'Cannot cancel' });
    }

    await prisma.transaction.update({
      where: { id : id as string },
      data: { status: 'CANCELLED' },
    });

    // 🔥 BALIKIN SEAT
    await prisma.events.update({
      where: { id: trx.order.eventId },
      data: {
        availableSeats: {
          increment: trx.order.quantity,
        },
      },
    });

    res.json({ message: 'Transaction cancelled & seat returned' });
  } catch (error: any) {
    res.status(500).json({
      message: 'Cancel failed',
      error: error.message,
    });
  }
});


// ⏰ AUTO EXPIRED (3 JAM)
cron.schedule('*/5 * * * *', async () => {
  console.log('Checking expired transactions...');

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const expired = await prisma.transaction.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: threeHoursAgo },
    },
    include: {
      order: true,
    },
  });

  for (const trx of expired) {
    await prisma.transaction.update({
      where: { id: trx.id },
      data: { status: 'EXPIRED' },
    });

    // 🔥 BALIKIN SEAT
    await prisma.events.update({
      where: { id: trx.order.eventId },
      data: {
        availableSeats: {
          increment: trx.order.quantity,
        },
      },
    });
  }
});

// ==================
// AUTH ROUTES
// ==================
app.use('/auth', authRoutes);

startRewardExpirationCron();

// ==================
// ERROR HANDLER
// ==================
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
});

// ==================
// SERVER
// ==================
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});