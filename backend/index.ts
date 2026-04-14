import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import cron from 'node-cron';
import authRoutes from './src/routes/authRoutes';
import { AppError } from './src/errors/app.error';
import { prisma } from './src/configs/prisma';
import { authMiddleware } from './src/middlewares/authMiddleware';
import { startRewardExpirationCron } from './src/cron/rewardExpirationCron';
import { AuthRequest } from './src/types/auth';

const app = express();
const port = Number(process.env.PORT ?? 3000);

// ==================
// MULTER
// ==================
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ==================
// MIDDLEWARE
// ==================
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// ==================
// ROOT
// ==================
app.get('/', (_req, res) => {
  res.send('API is running 🚀');
});

// ==================
// USERS
// ==================
app.get('/users', async (_req, res) => {
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

  res.json(users);
});

// ==================
// EVENTS
// ==================
app.get('/events', async (req, res) => {
  try {
    const search = req.query.search as string;

    const data = await prisma.events.findMany({
      where: search
        ? {
            name: { contains: search, mode: 'insensitive' },
          }
        : {},
      include: {
        users: { select: { name: true } },
        event_images: true,
      },
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/events/:id', async (req, res) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const event = await prisma.events.findUnique({
      where: { id },
      include: {
        event_images: true,
        users: { select: { name: true } },
      },
    });

    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================
// CREATE EVENT
// ==================
app.post('/events', async (req, res) => {
  try {
    const { name, price, totalSeats, eventOrganizerId, images } = req.body;

    const newEvent = await prisma.events.create({
      data: {
        name,
        price: Number(price),
        totalSeats: Number(totalSeats),
        availableSeats: Number(totalSeats),
        eventOrganizerId,
        event_images: {
          create:
            images?.map((url: string) => ({ url })) || [],
        },
      },
      include: {
        event_images: true,
        users: { select: { name: true } },
      },
    });

    res.status(201).json(newEvent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================
// ORDERS
// ==================
app.post('/orders/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // 🔥 FIX PARAM ID (WAJIB)
    const rawId = req.params.id;
    const eventId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // 🔥 FIX QUANTITY
    const qty = Number(req.body.quantity);

    if (!qty || qty < 1) {
      return res.status(400).json({ message: 'Quantity tidak valid' });
    }

    // 🔥 CEK LOGIN
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.events.findUnique({
        where: { id: eventId }, // ✅ sekarang aman
      });

      if (!event) throw new Error('Event not found');

      if (event.availableSeats < qty) {
        throw new Error('Seat tidak cukup');
      }

      const totalAmount = event.price * qty;

      const order = await tx.orders.create({
        data: {
          customerId: req.user!.id,
          eventId: eventId, // ✅ sudah pasti string
          quantity: qty,
          totalAmount,
        },
      });

      await tx.events.update({
        where: { id: eventId },
        data: {
          availableSeats: {
            decrement: qty,
          },
        },
      });

      return order;
    });

    res.status(201).json(result);

  } catch (error: any) {
    res.status(500).json({
      message: error.message || 'Internal Server Error',
    });
  }
});
//🔍 GET ORDERS 
app.get('/orders', async (_req: Request, res: Response) => { const data = await prisma.orders.findMany({ include: { users: true, event: true, }, }); res.json(data); }); 
//delete order 
app.delete('/orders/:id', authMiddleware, async (req: AuthRequest, res: Response) => { try { const rawId = req.params.id; const orderId = Array.isArray(rawId) ? rawId[0] : rawId; if (!req.user?.id) { return res.status(401).json({ message: 'Unauthorized' }); } 
// 🔥 cek order dulu (biar aman) 
const order = await prisma.orders.findUnique({ where: { id: orderId }, }); if (!order) { return res.status(404).json({ message: 'Order tidak ditemukan' }); } 
// 🔥 OPTIONAL (biar user ga bisa delete punya orang lain) 
if (order.customerId !== req.user.id) { return res.status(403).json({ message: 'Forbidden' }); } 
// 🔥 DELETE 
await prisma.orders.delete({ where: { id: orderId }, }); res.json({ message: 'Order berhasil dihapus' }); } catch (error: any) { console.error(error); res.status(500).json({ message: error.message || 'Internal Server Error', }); } });

// ==================
// TRANSACTION CREATE
// ==================
app.post('/transactions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { orders, totalAmount } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const trx = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        totalAmount: Number(totalAmount),

        orders: {
          connect: orders.map((id: string) => ({ id })),
        },

        // kalau schema kamu ada field wajib lain, contoh:
        // status: "PENDING",
      },
    });

    res.json(trx);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ==================
// UPLOAD PAYMENT
// ==================
app.post('/transactions/:id/upload', upload.single('paymentProof'), async (req: Request, res: Response) => {
  try {
const rawId = req.params.id;
const id = Array.isArray(rawId) ? rawId[0] : rawId;

if (!id) {
  return res.status(400).json({ message: 'ID is required' });
}
    const trx = await prisma.transaction.findUnique({ where: { id } });
    if (!trx) return res.status(404).json({ message: 'Not found' });

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        paymentProof: req.file?.filename,
        status: 'PAID',
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================
// CANCEL TRANSACTION (FIX)
// ==================
app.post('/transactions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const trx = await prisma.transaction.findUnique({
      where: { id },
      include: { orders: true },
    });

    if (!trx) return res.status(404).json({ message: 'Not found' });

    // 🔥 BALIKIN SEAT SEMUA ORDER
    for (const order of trx.orders) {
      await prisma.events.update({
        where: { id: order.eventId },
        data: {
          availableSeats: {
            increment: order.quantity,
          },
        },
      });
    }

    await prisma.transaction.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Cancelled' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================
// AUTO EXPIRED (2 JAM FIX)
// ==================
cron.schedule('*/5 * * * *', async () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const expired = await prisma.transaction.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: twoHoursAgo },
    },
    include: { orders: true },
  });

  for (const trx of expired) {
    for (const order of trx.orders) {
      await prisma.events.update({
        where: { id: order.eventId },
        data: {
          availableSeats: {
            increment: order.quantity,
          },
        },
      });
    }

    await prisma.transaction.update({
      where: { id: trx.id },
      data: { status: 'EXPIRED' },
    });
  }
});

// ==================
// AUTH
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
  res.status(500).json({ message: 'Internal server error' });
});

// ==================
// SERVER
// ==================
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});