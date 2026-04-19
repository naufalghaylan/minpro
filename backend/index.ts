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

function calculateFinalPrice(event: any) {
  let finalPrice = Number(event.price);

  const now = new Date().getTime();

  const start = event.discountStart
    ? new Date(event.discountStart).getTime()
    : null;

  const end = event.discountEnd
    ? new Date(event.discountEnd).getTime()
    : null;

  const isDiscountActive =
    event.discountType &&
    event.discountValue &&
    (!start || now >= start) &&
    (!end || now <= end);

  console.log({
    now,
    start,
    end,
    isDiscountActive,
  });

  if (isDiscountActive) {
    if (event.discountType === "PERCENT") {
      finalPrice =
        event.price - (event.price * event.discountValue) / 100;
    }

    if (event.discountType === "FIXED") {
      finalPrice = event.price - event.discountValue;
    }
  }

  if (finalPrice < 0) finalPrice = 0;

  return finalPrice;
}
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
app.get("/events", upload.array("images"), async (req, res) => {
  try {
    const { search } = req.query;

const events = await prisma.events.findMany({
      where: search
        ? {
            OR: [
              {
                name: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
              {
                city: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
      include: {
        event_images: true,
      },
    });
    const result = events.map((event) => ({
      ...event,
      finalPrice: calculateFinalPrice(event),
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error ambil event" });
  }
});
app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.events.findUnique({
      where: { id },
      include: {
        users: true,
        event_images: true,
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event tidak ditemukan" });
    }

    // 🔥 TAMBAH FINAL PRICE DI SINI
    const result = {
      ...event,
      finalPrice: calculateFinalPrice(event),
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error ambil event detail" });
  }
});
// ==================
// CREATE EVENT
// ==================
app.post(
  "/events",
  authMiddleware,
  upload.array("images"), 
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== "EVENT_ORGANIZER") {
        return res.status(403).json({ message: "Forbidden" });
      }

const {
  name,
  description,
  price,
  totalSeats,

  eventDate,
  startTime,
  endTime,

  location,
  city,

  discountType,
  discountValue,
  discountStart,
  discountEnd,
} = req.body;

      const files = req.files as Express.Multer.File[];

      const newEvent = await prisma.events.create({
        data: {
  name,
  description,
  price: Number(price),
  totalSeats: Number(totalSeats),
  availableSeats: Number(totalSeats),
  eventOrganizerId: req.user.id,
    eventDate: eventDate ? new Date(eventDate) : null,
    startTime,
    endTime,

    location,
    city,
  // 🔥 DISKON
  discountType: discountType || null,
  discountValue: discountValue ? Number(discountValue) : null,
  discountStart: discountStart ? new Date(discountStart) : null,
  discountEnd: discountEnd ? new Date(discountEnd) : null,

  event_images: {
    create: files.map((file) => ({
      url: file.filename,
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
            event : {
            include: {
              event_images: true,
            }
            },
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
            event: {
              include: {
                event_images: true,
              },
            }
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
app.post("/preview", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { eventId, quantity, voucherCode } = req.body;

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ message: "Quantity tidak valid" });
    }

    const event = await prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new Error("Event tidak ditemukan");

    let finalPrice = calculateFinalPrice(event);
    const price = event.price;

    const now = new Date();

    let voucherDiscount = 0;
    let voucherUsed: string | null = null;

    // 🔥 APPLY VOUCHER (TANPA UPDATE DB)
    if (voucherCode) {
      const voucher = await prisma.vouchers.findFirst({
        where: {
          code: voucherCode,
          eventId: event.id,
        },
      });

      if (!voucher) throw new Error("Voucher tidak valid");

      if (voucher.quota && voucher.used >= voucher.quota) {
        throw new Error("Voucher habis");
      }

      if (now < voucher.startDate || now > voucher.endDate) {
        throw new Error("Voucher tidak aktif");
      }

      if (voucher.discountType === "PERCENT") {
        voucherDiscount = (finalPrice * voucher.discountValue) / 100;
      } else {
        voucherDiscount = voucher.discountValue;
      }

      finalPrice -= voucherDiscount;
      voucherUsed = voucher.code;
    }

    if (finalPrice < 0) finalPrice = 0;

    const totalAmount = finalPrice * qty;

    res.json({
      price,
      finalPrice,
      totalAmount,
      quantity: qty,
      voucher: voucherUsed,
      voucherDiscount,
    });

  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
app.get("/vouchers", async (req, res) => {
  const data = await prisma.vouchers.findMany({
    include: { event: true },
  });
  res.json(data);
});
app.post("/vouchers", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const {
      code,
      discountType,
      discountValue,
      quota,
      startDate,
      endDate,
      eventId,
    } = req.body;

    // 🔒 VALIDASI BASIC
    if (!code || !discountType || !discountValue || !eventId) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    if (!["PERCENT", "FIXED"].includes(discountType)) {
      return res.status(400).json({ message: "Tipe diskon tidak valid" });
    }

    if (Number(discountValue) <= 0) {
      return res.status(400).json({ message: "Diskon harus lebih dari 0" });
    }

    // 🔥 CEK EVENT PUNYA EO INI
    const event = await prisma.events.findFirst({
      where: {
        id: eventId,
        eventOrganizerId: userId, // 🔥 penting (biar ga bisa inject event orang lain)
      },
    });

    if (!event) {
      return res.status(403).json({ message: "Event tidak ditemukan / bukan milikmu" });
    }

    // 🔥 CEK KODE UNIK
    const existing = await prisma.vouchers.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ message: "Kode voucher sudah dipakai" });
    }

    // 🔥 CREATE
    const voucher = await prisma.vouchers.create({
      data: {
        code,
        discountType,
        discountValue: Number(discountValue),
        quota: quota ? Number(quota) : null,
        used: 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        eventId,
      },
    });

    res.status(201).json({
      message: "Voucher berhasil dibuat",
      data: voucher,
    });

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});
app.delete("/vouchers/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const id = Array.isArray(req.params.id)
   ? req.params.id[0]
   : req.params.id;

    // 🔥 ambil voucher + event
    const voucher = await prisma.vouchers.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!voucher) {
      return res.status(404).json({ message: "Voucher tidak ditemukan" });
    }

    // 🔒 pastikan milik EO
    if (voucher.event.eventOrganizerId !== userId) {
      return res.status(403).json({ message: "Bukan voucher milikmu" });
    }

    await prisma.vouchers.delete({
      where: { id },
    });

    res.json({ message: "Voucher berhasil dihapus" });

  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
app.post('/checkout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { eventId, quantity, voucherCode } = req.body; // 🔥 tambah voucherCode

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ message: "Quantity tidak valid" });
    }

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

      // 🔥 harga awal + event discount
      let finalPrice = calculateFinalPrice(event);
      const price = event.price;

      const now = new Date();

      // ======================
      // 🔥 APPLY VOUCHER
      // ======================
      let voucherUsed: string | null = null;

      if (voucherCode) {
        const voucher = await tx.vouchers.findFirst({
          where: {
            code: voucherCode,
            eventId: event.id,
          },
        });

        if (!voucher) throw new Error("Voucher tidak valid");

        if (voucher.quota && voucher.used >= voucher.quota) {
          throw new Error("Voucher habis");
        }

        if (now < voucher.startDate || now > voucher.endDate) {
          throw new Error("Voucher tidak aktif");
        }

        // 🔥 apply voucher
        if (voucher.discountType === "PERCENT") {
          finalPrice -= (finalPrice * voucher.discountValue) / 100;
        } else {
          finalPrice -= voucher.discountValue;
        }

        voucherUsed = voucher.code;

        // 🔥 update usage
        await tx.vouchers.update({
          where: { id: voucher.id },
          data: {
            used: { increment: 1 },
          },
        });
      }

      // 🔥 biar ga minus
      if (finalPrice < 0) finalPrice = 0;

      const totalAmount = finalPrice * qty;

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

          price: price,
          finalPrice: finalPrice,

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

      return {
        trx,
        voucher: voucherUsed,
        finalPrice,
        totalAmount,
      };
    });

    res.status(201).json({
      message: "Checkout berhasil",
      transactionId: result.trx.id,
      finalPrice: result.finalPrice,
      totalAmount: result.totalAmount,
      voucher: result.voucher, // 🔥 kirim ke frontend
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
app.post("/reviews", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { eventId, rating, comment } = req.body;

    // 🔐 cek login
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ⭐ validasi rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating harus 1-5" });
    }

    // 🎟️ cek sudah beli event
const trx = await prisma.transaction.findFirst({
  where: {
    userId,
    order: {
      eventId: eventId, // ✅ TANPA some
    },
  },
});

    if (!trx) {
      return res.status(403).json({
        message: "Kamu belum membeli event ini",
      });
    }

    // 🔥 CEK SUDAH REVIEW BELUM (INI YANG KAMU TANYA)
    const existing = await prisma.reviews.findFirst({
      where: {
        userId,
        eventId,
      },
    });

    if (existing) {
      return res.status(400).json({
        message: "Kamu sudah review event ini",
      });
    }

    // ✅ CREATE REVIEW
    const review = await prisma.reviews.create({
      data: {
        rating: Number(rating),
        comment,
        user: {
          connect: { id: userId },
        },
        event: {
          connect: { id: eventId },
        },
      },
    });

    res.json(review);

  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
app.get("/events/:id/reviews", async (req, res) => {
  const { id } = req.params;

  const reviews = await prisma.reviews.findMany({
    where: { eventId: id },
    include: {
      user: true,
    },
  });

  res.json(reviews);
});
app.get("/events/:id/rating", async (req, res) => {
  const { id } = req.params;

  const data = await prisma.reviews.aggregate({
    where: { eventId: id },
    _avg: {
      rating: true,
    },
    _count: true,
  });

  res.json({
    average: data._avg.rating || 0,
    total: data._count,
  });
});
app.get("/my-tickets", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const data = await prisma.transaction.findMany({
      where: {
        userId,
        status: "DONE", // 🔥 penting
      },
      include: {
        order: {
          include: {
            event: true,
          },
        },
      },
    });

    res.json(data);

  } catch (error: any) {
    res.status(400).json({ message: error.message });
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