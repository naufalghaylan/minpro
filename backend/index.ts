import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import authRoutes from './src/routes/authRoutes';
import { AppError } from './src/errors/app.error';
import { prisma } from './src/configs/prisma';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

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
          select: { name: true }, // ambil nama user
        },
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});