import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

import authRoutes from './src/routes/authRoutes';
import { AppError } from './src/errors/app.error';
import { prisma } from './src/configs/prisma';

const app = express();
const port = Number(process.env.PORT ?? 3000);

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
app.get('/events', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.events.findMany({
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

// 🔍 GET EVENT DETAIL
// app.get('/events/:id', async (req: Request, res: Response) => {
//   const id = req.params.id;

//   const event = await prisma.events.findUnique({
//     where: { id },
//     include: {
//       event_images: true,
//       users: {
//         select: { name: true },
//       },
//     },
//   });

//   if (!event) {
//     return res.status(404).json({ message: 'Event not found' });
//   }

//   res.json(event);
// });

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

// ➕ CREATE ORDER
app.post('/orders', async (req: Request, res: Response) => {
  try {
    const { customerId, eventId, quantity } = req.body;

    const event = await prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.availableSeats < quantity) {
      return res.status(400).json({
        message: 'Seat tidak cukup',
      });
    }

    const totalAmount = event.price * quantity;

  const order = await prisma.orders.create({
  data: {
    customerId,
    eventId,
    quantity: Number(quantity),
    totalAmount,
  },
});

    // 🔥 kurangi seat otomatis
    await prisma.events.update({
      where: { id: eventId },
      data: {
        availableSeats: {
          decrement: Number(quantity),
        },
      },
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error creating order',
      error: error.message,
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
// AUTH ROUTES
// ==================
app.use('/auth', authRoutes);

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