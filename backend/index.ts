import express, { type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const app = express();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Please add it to your environment variables.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("API jalan 🚀");
});

app.get("/users", async (req: Request, res: Response) => {
  const data = await prisma.user.findMany();
  res.json(data);
});

app.post("/users", async (req: Request, res: Response) => {
  const { name, username, email, password, role } = req.body as {
    name: string;
    username: string;
    email: string;
    password: string;
    role: "CUSTOMER" | "EVENT_ORGANIZER";
  };

  if (!name || !username || !email || !password || !role) {
    return res.status(400).json({ error: "name, username, email, password, dan role wajib diisi" });
  }

  try {
    const user = await prisma.user.create({
      data: { name, username, email, password, role },
    });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server jalan di http://localhost:3000");
});