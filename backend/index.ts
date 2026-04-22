import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import cron from 'node-cron';
import authRoutes from './src/routes/authRoutes';
import organizerDashboardRoutes from './src/routes/organizerDashboardRoutes';
import { AppError } from './src/errors/app.error';
import { prisma } from './src/configs/prisma';
import { authMiddleware } from './src/middlewares/authMiddleware';
import { startRewardExpirationCron } from './src/cron/rewardExpirationCron';
import { AuthRequest } from './src/types/auth';
import { decideOrganizerTransaction } from './src/services/organizerDashboardService';

const app = express();
const port = Number(process.env.PORT ?? 3000);
function getEventStatus(event: any) {
  const now = new Date();

  if (!event.eventDate || !event.endTime) return "UNKNOWN";

  const end = new Date(event.eventDate);
  const [h, m] = event.endTime.split(":");

  end.setHours(Number(h));
  end.setMinutes(Number(m));
  end.setSeconds(0);

  if (now > end) return "ENDED";

  const start = new Date(event.eventDate);

  if (event.startTime) {
    const [sh, sm] = event.startTime.split(":");
    start.setHours(Number(sh));
    start.setMinutes(Number(sm));
  }

  if (now >= start && now <= end) return "ONGOING";

  return "UPCOMING";
}
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
app.get("/events", async (req, res) => {
  try {
    const { search, status } = req.query;

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

    let result = events.map((event) => ({
      ...event,
      finalPrice: calculateFinalPrice(event),
      status: getEventStatus(event), // 🔥 tambahan penting
    }));

    // 🔥 filter by status
    if (status) {
      result = result.filter(
        (e) => e.status === String(status).toUpperCase()
      );
    }

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
            event: {
              include: {
                event_images: true,
              },
            },
          },
        },
      },
    });

    if (!trx) {
      return res.status(404).json({ message: "Not found" });
    }

    // 🔥 FLATTEN RESPONSE
    res.json({
      id: trx.id,
      status: trx.status,
      expiredAt: trx.expiredAt,

      // 🔥 PENTING (INI YANG DIPAKAI FRONTEND)
      totalAmount: trx.totalAmount,
      walletUsed: trx.walletAmountUsed,
      voucherDiscount: trx.voucherDiscountUsed,
      couponDiscount: trx.couponDiscountUsed,
      referralDiscount: trx.referralDiscountUsed,

      order: trx.order,
    });

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
          order: {
            event: {
              eventOrganizerId: req.user.id,
            },
          },
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

      const updated = await decideOrganizerTransaction(req.user.id, id, 'accept');

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

      const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
      const updated = await decideOrganizerTransaction(req.user.id, id, 'reject', { reason });

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

    // 🔥 APPLY VOUCHER/COUPON (TANPA UPDATE DB)
    if (voucherCode) {
      const voucher = await prisma.vouchers.findFirst({
        where: {
          code: voucherCode,
          eventId: event.id,
        },
      });

      if (!voucher) {
        // Coba cari sebagai coupon jika voucher tidak ditemukan
        const coupon = await prisma.coupons.findFirst({
          where: {
            code: voucherCode,
            userId: req.user?.id,
            usedAt: null,
            expiresAt: { gt: now },
          },
        });

        if (!coupon) throw new Error("Voucher/Coupon tidak valid");

        // Apply coupon discount
        if (coupon.amount <= 100) {
          voucherDiscount = (finalPrice * coupon.amount) / 100;
        } else {
          voucherDiscount = coupon.amount;
        }

        voucherUsed = coupon.code;
      } else {
        // Apply voucher discount
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

        voucherUsed = voucher.code;
      }

      // Kurangi finalPrice dengan voucher discount
      finalPrice -= voucherDiscount;
    }

    if (finalPrice < 0) finalPrice = 0;

    const totalAmount = finalPrice * qty;

    res.json({
      price,
      finalPrice,
      totalAmount,
      quantity: qty,
      voucher: voucherUsed,
      voucherDiscount: voucherDiscount * qty,
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
    const { eventId, quantity, voucherCode, couponCode, walletAmount, referralCode } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ message: "Quantity tidak valid" });
    }

    const requestedWalletAmount = Number(walletAmount ?? 0);
    if (Number.isNaN(requestedWalletAmount) || requestedWalletAmount < 0) {
      return res.status(400).json({ message: "walletAmount tidak valid" });
    }

    const existing = await prisma.transaction.findFirst({
      where: { userId, status: "PENDING" },
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

      const status = getEventStatus(event);
      if (status === "ENDED") {
        throw new Error("Event sudah selesai");
      }

      if (event.availableSeats < qty) {
        throw new Error("Seat tidak cukup");
      }

      const now = new Date();

      // ======================
      // 🔥 BASE PRICE
      // ======================
      let finalPrice = calculateFinalPrice(event);
      const price = event.price;

      // ======================
      // INIT
      // ======================
      let voucherUsed: string | null = null;
      let voucherDiscount = 0;

      let couponUsed: string | null = null;
      let couponDiscount = 0;

      let referralUsed: string | null = null;

      let walletUsed = 0;

      // ======================
      // 🔥 REFERRAL → JADI COUPON
      // ======================
      if (referralCode && referralCode.trim() !== "") {
        const cleanCode = referralCode.trim();

        const refUser = await tx.user.findUnique({
          where: { referralCode: cleanCode },
        });

        if (!refUser) throw new Error("Kode referral tidak valid");
        if (refUser.id === userId) throw new Error("Tidak bisa pakai referral sendiri");

        const trxCount = await tx.transaction.count({
          where: { userId },
        });

        if (trxCount > 0) {
          throw new Error("Referral hanya untuk transaksi pertama");
        }

        // 🔥 ambil coupon referrer
        const refCoupon = await tx.coupons.findFirst({
          where: {
            userId: refUser.id,
            usedAt: null,
            expiresAt: { gt: now },
          },
        });

        if (!refCoupon) {
          throw new Error("Referrer tidak punya coupon aktif");
        }

        // 🔥 apply discount
        if (refCoupon.amount <= 100) {
          couponDiscount = (finalPrice * refCoupon.amount) / 100;
        } else {
          couponDiscount = refCoupon.amount;
        }

        finalPrice -= couponDiscount;
        referralUsed = cleanCode;

        // 🔥 tandai coupon referrer sebagai used (optional, bisa dihapus kalau mau clone saja)
        await tx.coupons.update({
          where: { id: refCoupon.id },
          data: { usedAt: now },
        });
      }

      if (voucherCode) {
        const voucher = await tx.vouchers.findFirst({
          where: { code: voucherCode, eventId: event.id },
        });

        if (!voucher) {
          const coupon = await tx.coupons.findFirst({
            where: {
              code: voucherCode,
              userId,
              usedAt: null,
              expiresAt: { gt: now },
            },
          });

          if (!coupon) throw new Error("Voucher/Coupon tidak valid");

          if (coupon.amount <= 100) {
            couponDiscount = (finalPrice * coupon.amount) / 100;
          } else {
            couponDiscount = coupon.amount;
          }

          finalPrice -= couponDiscount;
          couponUsed = coupon.code;

          await tx.coupons.update({
            where: { id: coupon.id },
            data: { usedAt: now },
          });
        } else {
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

          await tx.vouchers.update({
            where: { id: voucher.id },
            data: { used: { increment: 1 } },
          });
        }
      }

      if (finalPrice < 0) finalPrice = 0;
      let totalAmount = finalPrice * qty;

      // ======================
      // WALLET
      // ======================
      if (requestedWalletAmount > 0) {
        const wallet = await tx.wallets.findFirst({
          where: {
            userId,
            balance: { gt: 0 },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        });

        if (!wallet) throw new Error("Wallet tidak tersedia");

        walletUsed = Math.min(requestedWalletAmount, wallet.balance, totalAmount);
        totalAmount -= walletUsed;

        await tx.wallets.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: walletUsed },
            usedAt: now,
          },
        });
      }

      const expiredAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const trx = await tx.transaction.create({
        data: {
          userId,
          totalAmount: Math.max(0, totalAmount),

          walletAmountUsed: Math.round(walletUsed),

          couponCodeUsed: couponUsed,
          couponDiscountUsed: Math.round(couponDiscount * qty),

          voucherCodeUsed: voucherUsed,
          voucherDiscountUsed: Math.round(voucherDiscount * qty),

          referralCodeUsed: referralUsed,

          status: "PENDING",
          expiredAt,
        },
      });

      await tx.orders.create({
        data: {
          customerId: userId,
          eventId,
          quantity: qty,

          price,
          finalPrice,
          totalAmount,

          transactionId: trx.id,

          referralCodeUsed: referralUsed,
        },
      });

      await tx.events.update({
        where: { id: eventId },
        data: {
          availableSeats: { decrement: qty },
        },
      });

      return {
        trx,
        finalPrice,
        totalAmount,
        voucher: voucherUsed,
        coupon: couponUsed,
        walletUsed,
      };
    });

    res.status(201).json({
      message: "Checkout berhasil",
      transactionId: result.trx.id,
      finalPrice: result.finalPrice,
      totalAmount: result.totalAmount,
      voucher: result.voucher,
      coupon: result.coupon,
      walletUsed: result.walletUsed,
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

    // 🔥 CEK SUDAH REVIEW BELUM 
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
app.get("/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.reviews.findMany({
      where: { id },
      include: {
        user: true, // opsional (biar ada nama user)
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal ambil review" });
  }
});
app.get("/api/ratings/organizer", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    const reviews = await prisma.reviews.findMany({
      where: {
        event: {
          eventOrganizerId: userId,
        },
      },
      include: {
        user: {
          select: { name: true },
        },
        event: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch ratings" });
  }
});
app.post('/referral/validate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ message: "Referral code wajib diisi" });
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode },
    });

    if (!referrer) {
      return res.status(404).json({ message: "Referral tidak valid" });
    }

    if (referrer.id === userId) {
      return res.status(400).json({ message: "Tidak bisa pakai referral sendiri" });
    }

    const alreadyUsed = await prisma.coupons.findFirst({
      where: {
        userId,
        source: "REFERRAL_SIGNUP",
      },
    });

    if (alreadyUsed) {
      return res.status(400).json({
        message: "Referral hanya bisa digunakan sekali",
      });
    }

    const referrerCoupon = await prisma.coupons.findFirst({
      where: {
        userId: referrer.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!referrerCoupon) {
      return res.status(404).json({
        message: "Referrer tidak punya coupon aktif",
      });
    }

    const newCoupon = await prisma.coupons.create({
      data: {
        userId: userId, // 🔥 sekarang sudah pasti string
        code: null,
        source: "REFERRAL_SIGNUP",
        amount: referrerCoupon.amount,
        expiresAt: referrerCoupon.expiresAt,
      },
    });

    return res.status(200).json({
      message: "Referral berhasil!",
      coupon: newCoupon,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Gagal validasi referral",
    });
  }
});
// ==================
// AUTH
// ==================
app.use('/auth', authRoutes);
app.use('/organizer/dashboard', organizerDashboardRoutes);
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

