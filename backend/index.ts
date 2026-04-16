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
app.use("/uploads", express.static("uploads"));
// ==================
// ROOT
// ==================
app.get('/', (_req, res) => {
  res.send('API is running 🚀');
});

// ==================
// EVENTS
// ==================
app.get('/events', async (req, res) => {
  const search = req.query.search as string;

  const data = await prisma.events.findMany({
    where: search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {},
    include: {
      users: { select: { name: true } },
      event_images: true,
    },
  });

  res.json(data);
});
app.get("/events/:id", async (req, res) => {
  console.log("PARAM ID:", req.params.id);

  const event = await prisma.events.findUnique({
    where: { id: req.params.id },
  });

  console.log("EVENT:", event);

  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  res.json(event);
});
// ==================
// CREATE EVENT
// ==================
app.post(
  "/events",
  authMiddleware,
  upload.array("images"), // 🔥 MULTIPLE FILE
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== "EVENT_ORGANIZER") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { name, price, totalSeats } = req.body;

      const files = req.files as Express.Multer.File[];

      const newEvent = await prisma.events.create({
        data: {
          name,
          price: Number(price),
          totalSeats: Number(totalSeats),
          availableSeats: Number(totalSeats),
          eventOrganizerId: req.user.id,

          event_images: {
            create: files.map((file) => ({
              url: file.filename, // 🔥 simpan filename
            })),
          },
        },
        include: {
          event_images: true,
        },
      });

      res.status(201).json(newEvent);

    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);
app.get('/transactions/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const trx = await prisma.transaction.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!trx) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(trx);

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================
// 🔥 CHECKOUT
// ==================
app.get("/transactions", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const data = await prisma.transaction.findMany({
      where: { userId },
      include: {
        order: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
// ==================
// 🔥 VERIFICATION LIST (EO ONLY)
// ==================
app.get(
  "/admin/transactions",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== "EVENT_ORGANIZER") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const data = await prisma.transaction.findMany({
        where: {
          status: "PAID", // 🔥 hanya yang sudah upload bukti
        },
        include: {
          order: {
            include: {
              event: true,
            },
          },
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);
app.post(
  "/admin/transactions/:id/approve",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== "EVENT_ORGANIZER") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const trx = await prisma.transaction.findUnique({
        where: { id },
      });

      if (!trx) {
        return res.status(404).json({ message: "Not found" });
      }

      if (trx.status !== "PAID") {
        return res.status(400).json({
          message: "Transaksi belum dibayar",
        });
      }

      const updated = await prisma.transaction.update({
        where: { id },
        data: { status: "DONE" },
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);
app.post(
  "/admin/transactions/:id/reject",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== "EVENT_ORGANIZER") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const trx = await prisma.transaction.findUnique({
        where: { id },
        include: { order: true }, // 🔥 WAJIB
      });

      if (!trx) {
        return res.status(404).json({ message: "Not found" });
      }

      if (trx.status !== "PAID") {
        return res.status(400).json({
          message: "Transaksi belum dibayar",
        });
      }

      // 🔥 BALIKIN SEAT
      if (trx.order) {
        await prisma.events.update({
          where: { id: trx.order.eventId },
          data: {
            availableSeats: {
              increment: trx.order.quantity,
            },
          },
        });
      }

      const updated = await prisma.transaction.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);
app.post('/checkout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { eventId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ message: "Quantity tidak valid" });
    }

    // ❌ anti double transaksi
    const existing = await prisma.transaction.findFirst({
      where: {
        userId,
        status: "PENDING",
      },
    });

    if (existing) {
      return res.status(400).json({
        message: "Selesaikan pembayaran sebelumnya dulu",
      });
    }

    const result = await prisma.$transaction(async (tx) => {

      const event = await tx.events.findUnique({
        where: { id: eventId },
      });

      if (!event) throw new Error("Event tidak ditemukan");
      if (event.availableSeats < qty) throw new Error("Seat tidak cukup");

      const totalAmount = event.price * qty;

      const expiredAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const trx = await tx.transaction.create({
        data: {
          userId,
          totalAmount,
          status: "PENDING",
          expiredAt,
        },
      });

      await tx.orders.create({
        data: {
          customerId: userId,
          eventId,
          quantity: qty,
          totalAmount,
          transactionId: trx.id,
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

      return trx;
    });

    res.status(201).json({
      message: "Checkout berhasil",
      transactionId: result.id,
    });

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// ==================
// 💳 UPLOAD PAYMENT
// ==================
app.post(
  "/transactions/:id/upload",
  authMiddleware,
  upload.single("paymentProof"),
  async (req: AuthRequest, res) => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      console.log("FILE:", req.file);

      if (!req.file) {
        return res.status(400).json({
          message: "File tidak ditemukan",
        });
      }

      const trx = await prisma.transaction.findUnique({
        where: { id },
      });

      if (!trx) {
        return res.status(404).json({
          message: "Transaksi tidak ditemukan",
        });
      }

      // 🔥 CEK STATUS
      if (trx.status !== "PENDING") {
        return res.status(400).json({
          message: "Transaksi sudah tidak valid",
        });
      }

      // 🔥 CEK EXPIRED (INI YANG PENTING BANGET)
      if (trx.expiredAt && new Date() > trx.expiredAt) {
        return res.status(400).json({
          message: "Transaksi sudah expired",
        });
      }

      // 🔥 UPDATE AMAN
      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          paymentProof: req.file.filename,
          status: "PAID",
        },
      });

      return res.json({
        message: "Upload berhasil",
        data: updated,
      });

    } catch (err: any) {
      console.error("UPLOAD ERROR DETAIL:", err);
      return res.status(500).json({
        message: err.message || "Internal Server Error",
      });
    }
  }
);
// ==================
// ❌ CANCEL
// ==================
app.post('/transactions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const trx = await prisma.transaction.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!trx) return res.status(404).json({ message: 'Not found' });

    if (trx.order) {
      await prisma.events.update({
        where: { id: trx.order.eventId },
        data: {
          availableSeats: {
            increment: trx.order.quantity,
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
// ⏳ AUTO EXPIRED (FIXED 🔥)
// ==================
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();

    const expired = await prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        expiredAt: { lt: now }, // ✅ pakai expiredAt
      },
      include: { order: true },
    });

    for (const trx of expired) {

      if (trx.order) {
        await prisma.events.update({
          where: { id: trx.order.eventId },
          data: {
            availableSeats: {
              increment: trx.order.quantity,
            },
          },
        });
      }

      await prisma.transaction.update({
        where: { id: trx.id },
        data: { status: 'EXPIRED' },
      });
    }

    if (expired.length > 0) {
      console.log(`Expired ${expired.length} transaksi`);
    }

  } catch (error) {
    console.error("CRON ERROR:", error);
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