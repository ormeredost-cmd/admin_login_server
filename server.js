// server.js - FINAL PRODUCTION READY CODE ✅ (Aapka code + Extra Features)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

// ✅ PRODUCTION CORS - Local (3000+3001) + Render Frontend
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",     // Aapka current React port
    "https://bgmi-admin-panel.onrender.com",
    "https://bgmi-admin-panel-*.onrender.com",
    "https://your-frontend.vercel.app"  // Vercel add karein if using
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ RATE LIMITING (Brute force protection)
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

/* =============================== 
   DEBUG ENV (PROD में comment कर दें)
================================ */
console.log("🔥 ENV STATUS:", {
  ADMIN_ID: process.env.ADMIN_ID ? "✅ SET" : "❌ MISSING",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "✅ SET" : "❌ MISSING",
  JWT_SECRET: process.env.JWT_SECRET ? "✅ SET" : "❌ MISSING",
  PORT: process.env.PORT || 5000
});

/* =============================== 
   HEALTH CHECK + INFO
================================ */
app.get("/", (req, res) => {
  res.json({ 
    status: "BGMI Admin Server ✅ LIVE",
    timestamp: new Date().toISOString(),
    corsOrigins: [
      "http://localhost:3000", 
      "http://localhost:3001",
      "https://bgmi-admin-panel.onrender.com"
    ],
    endpoints: ["/admin/login (POST)", "/admin/verify (GET)"],
    version: "2.0 - Production Ready"
  });
});

/* =============================== 
   ADMIN LOGIN ✅ (Rate limited)
================================ */
app.post("/admin/login", (req, res) => {
  const { id, password } = req.body;

  console.log("🚀 LOGIN ATTEMPT:", { 
    id: id || "EMPTY", 
    ip: req.ip,
    attempts: loginAttempts[req.ip]?.length || 0 
  });

  // Env check
  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
    console.error("❌ CRITICAL: ADMIN ENV MISSING");
    return res.status(500).json({
      success: false,
      message: "Server setup incomplete. Contact developer."
    });
  }

  // Credentials match
  if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { 
        role: "admin", 
        id: process.env.ADMIN_ID,
        timestamp: Date.now()
      },
      process.env.JWT_SECRET || "fallback-super-secret-do-not-use-in-prod",
      { expiresIn: "7d" }
    );

    console.log("✅ ADMIN LOGIN SUCCESS:", { id: process.env.ADMIN_ID });
    
    return res.json({
      success: true,
      token,
      message: "Admin login successful ✅",
      expiresIn: 604800,  // 7 days seconds
      user: { role: "admin", id: process.env.ADMIN_ID }
    });
  }

  console.log("❌ LOGIN FAILED:", { id });
  return res.status(401).json({
    success: false,
    message: "Invalid admin credentials"
  });
});

/* =============================== 
   ADMIN VERIFY (JWT Protected) ✅
================================ */
app.get("/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: "Authorization header missing or invalid format. Use: Bearer <token>" 
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-super-secret-do-not-use-in-prod");
    console.log("✅ TOKEN VERIFIED:", decoded.role);
    
    return res.json({ 
      success: true, 
      user: { 
        role: decoded.role, 
        id: decoded.id,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      } 
    });
  } catch (error) {
    console.log("❌ TOKEN ERROR:", error.message);
    return res.status(401).json({ 
      success: false, 
      message: "Token invalid or expired. Login again." 
    });
  }
});

/* =============================== 
   LOGOUT (Optional - Client clear karega token)
================================ */
app.post("/admin/logout", (req, res) => {
  console.log("👋 ADMIN LOGOUT");
  res.json({ success: true, message: "Logged out successfully. Clear token from client." });
});

/* =============================== 
   SERVER START - Render + Local Ready
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {  
  console.log(`\n🚀 BGMI Admin Server LIVE on http://localhost:${PORT}`);
  console.log(`📊 Health check:     http://localhost:${PORT}/`);
  console.log(`🔐 Admin login:      POST http://localhost:${PORT}/admin/login`);
  console.log(`✅ Token verify:     GET  http://localhost:${PORT}/admin/verify`);
  console.log(`🛡️  CORS enabled for localhost:3000/3001 + Render\n`);
});
