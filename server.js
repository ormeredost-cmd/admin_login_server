import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   DEBUG ENV (remove later)
================================ */
console.log("ENV LOADED =>", {
  ADMIN_ID: process.env.ADMIN_ID,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
});

/* ===============================
   ADMIN LOGIN
================================ */
app.post("/admin/login", (req, res) => {
  const { id, password } = req.body;

  console.log("LOGIN TRY:", id, password);

  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: "ENV not loaded",
    });
  }

  if (
    id === process.env.ADMIN_ID &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      token,
      message: "Admin login success",
    });
  }

  return res.status(401).json({
    success: false,
    message: "Wrong Admin Credentials",
  });
});

/* ===============================
   ADMIN VERIFY (JWT CHECK)
================================ */
app.get("/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false });
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ success: true });
  } catch {
    return res.status(401).json({ success: false });
  }
});

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("✅ Admin server running on port", PORT);
});
