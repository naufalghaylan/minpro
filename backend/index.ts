import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import authRoutes from './src/routes/authRoutes';
import { AppError } from './src/errors/app.error';
import { prisma } from './src/configs/prisma';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: 'http://localhost:5173', credentials:  true , methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));

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
      // password is intentionally excluded
    },
  });



app.get('/', (_req: Request, res: Response) => {
  return res.send('API is running');
});

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
    },
  });

  return res.status(200).json(users);
});


// Endpoint untuk mengambil semua event beserta nama event organizer

// Endpoint untuk mengambil semua event beserta nama event organizer
app.get('/events', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.events.findMany({
      include: {
        users: {
          select: { name: true },
        },
        event_images: true, // 🔥 ini ambil semua gambar
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

app.use('/auth', authRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
});



app.post('/orders', async (req: Request, res: Response) => {
  try {
    const { customerId, eventId, quantity, buktiTf } = req.body;

    // ambil event untuk harga
    const event = await prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const totalAmount = event.price * quantity;

    const order = await prisma.orders.create({
      data: {
        id : "cekok",
        customerId,
        eventId,
        quantity : Number(quantity),
        totalAmount,
        status: 'PENDING',
        buktiTf : Number(buktiTf),
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
app.get('/orders', async (_req: Request, res: Response) => {
  const data = await prisma.orders.findMany({
    include: {
      user: true,
      event: true,
    },
  });

  res.json(data);
});
// ✅ PATCH ORDER
app.patch('/orders/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { buktiTf } = req.body;

  const order = await prisma.orders.update({
    where: { id },
    data: {
      buktiTf,
      status: 'PAID',
    },
  });

  res.json(order);
});
// ✅ GET EVENT DETAIL (PISAH)
app.get('/events/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

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
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});