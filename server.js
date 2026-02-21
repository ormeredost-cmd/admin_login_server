// server.js - FINAL PRODUCTION READY CODE ✅
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

// ===============================
// ✅ CORS CONFIGURATION
// ===============================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://bgmi-admin-panel.onrender.com",
  "https://bgmi-admin-panel-9eei.onrender.com", // Add your Render frontend URL
  "https://your-frontend.vercel.app" // If you deploy frontend on Vercel
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Postman / curl / mobile apps
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ===============================
// ✅ RATE LIMITING (Brute force protection)
// ===============================
let loginAttempts = {};
app.use('/admin/login', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  loginAttempts[ip] = loginAttempts[ip] || [];
  loginAttempts[ip] = loginAttempts[ip].filter(time => now - time < 15 * 60 * 1000); // 15 min window

  if (loginAttempts[ip].length > 5) {
    return res.status(429).json({ success: false, message: "Too many login attempts. Try after 15 min" });
  }

  loginAttempts[ip].push(now);
  next();
});

// ===============================
// ✅ DEBUG ENV
// ===============================
console.log("🔥 ENV STATUS:", {
  ADMIN_ID: process.env.ADMIN_ID ? "✅ SET" : "❌ MISSING",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "✅ SET" : "❌ MISSING",
  JWT_SECRET: process.env.JWT_SECRET ? "✅ SET" : "❌ MISSING",
  PORT: process.env.PORT || 5000
});

// ===============================
// ✅ HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.json({ 
    status: "BGMI Admin Server ✅ LIVE",
    timestamp: new Date().toISOString(),
    corsOrigins: allowedOrigins,
    endpoints: ["/admin/login (POST)", "/admin/verify (GET)"],
    version: "2.0 - Production Ready"
  });
});

// ===============================
// ✅ ADMIN LOGIN
// ===============================
app.post("/admin/login", (req, res) => {
  const { id, password } = req.body;

  console.log("🚀 LOGIN ATTEMPT:", { 
    id: id || "EMPTY", 
    ip: req.ip,
    attempts: loginAttempts[req.ip]?.length || 0 
  });

  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: "Server setup incomplete. Contact developer."
    });
  }

  if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { role: "admin", id: process.env.ADMIN_ID, timestamp: Date.now() },
      process.env.JWT_SECRET || "fallback-super-secret",
      { expiresIn: "7d" }
    );

    console.log("✅ ADMIN LOGIN SUCCESS:", { id: process.env.ADMIN_ID });

    return res.json({
      success: true,
      token,
      message: "Admin login successful ✅",
      expiresIn: 604800,
      user: { role: "admin", id: process.env.ADMIN_ID }
    });
  }

  console.log("❌ LOGIN FAILED:", { id });
  return res.status(401).json({
    success: false,
    message: "Invalid admin credentials"
  });
});

// ===============================
// ✅ ADMIN VERIFY (JWT Protected)
// ===============================
app.get("/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: "Authorization header missing or invalid format." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-super-secret");
    console.log("✅ TOKEN VERIFIED:", decoded.role);

    return res.json({ 
      success: true, 
      user: { role: decoded.role, id: decoded.id, expiresAt: new Date(decoded.exp * 1000).toISOString() }
    });
  } catch (error) {
    console.log("❌ TOKEN ERROR:", error.message);
    return res.status(401).json({ success: false, message: "Token invalid or expired. Login again." });
  }
});

// ===============================
// ✅ LOGOUT
// ===============================
app.post("/admin/logout", (req, res) => {
  console.log("👋 ADMIN LOGOUT");
  res.json({ success: true, message: "Logged out successfully. Clear token from client." });
});

// ===============================
// ✅ SERVER START
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {  
  console.log(`🚀 BGMI Admin Server LIVE on port ${PORT}`);
});