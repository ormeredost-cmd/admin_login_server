// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();

/* ===============================
   TRUST PROXY ✅
   Needed on Render / reverse proxy
================================ */
app.set("trust proxy", 1);

/* ===============================
   CORS CONFIG ✅
================================ */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://bgmi-admin-panel-9eei.onrender.com",
  "https://free-fire-admin-panel.onrender.com",
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

/* ===============================
   RATE LIMITING LOGIN
================================ */
const loginAttempts = {};

app.use("/admin/login", (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();

  loginAttempts[ip] = loginAttempts[ip] || [];
  loginAttempts[ip] = loginAttempts[ip].filter(
    (time) => now - time < 15 * 60 * 1000
  );

  if (loginAttempts[ip].length >= 5) {
    return res.status(429).json({
      success: false,
      message: "Too many login attempts. Try after 15 min",
    });
  }

  loginAttempts[ip].push(now);
  next();
});

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({
    status: "BGMI Admin Server ✅ LIVE",
    timestamp: new Date().toISOString(),
    endpoints: [
      { path: "/admin/login", method: "POST" },
      { path: "/admin/verify", method: "GET" },
    ],
  });
});

/* ===============================
   ADMIN LOGIN
================================ */
app.post("/admin/login", (req, res) => {
  const { id, password } = req.body;

  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Server not configured. Missing ADMIN_ID, ADMIN_PASSWORD or JWT_SECRET",
    });
  }

  if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { role: "admin", id: process.env.ADMIN_ID },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ ADMIN LOGIN SUCCESS: ${id}`);
    return res.json({ success: true, token });
  }

  console.log(`❌ LOGIN FAILED: ${id} from IP ${req.ip}`);
  return res.status(401).json({
    success: false,
    message: "Invalid admin credentials",
  });
});

/* ===============================
   ADMIN VERIFY
================================ */
app.get("/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Missing token",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ success: true, user: decoded });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
});

/* ===============================
   404 HANDLER
================================ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ===============================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  if (err.message?.includes("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 BGMI Admin Server LIVE on port ${PORT}`);
});