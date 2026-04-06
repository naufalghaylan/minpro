const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// route test
app.get("/", (req, res) => {
  res.send("API jalan 🚀");
});

// ambil semua user
app.get("/users", async (req, res) => {
  const data = await prisma.user.findMany();
  res.json(data);
});

// tambah user
app.post("/users", async (req, res) => {
  const { name, email } = req.body;
  const user = await prisma.user.create({
    data: { name, email },
  });
  res.json(user);
});

app.listen(3000, () => {
  console.log("Server jalan di http://localhost:3000");
});