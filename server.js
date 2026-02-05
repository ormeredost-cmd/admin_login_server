// server.js - FINAL PRODUCTION READY CODE ✅
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

// ✅ PRODUCTION CORS - Local + Render Frontend
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://bgmi-admin-panel.onrender.com",  // अपना frontend URL यहाँ डालें
    "https://bgmi-admin-panel-*.onrender.com"  // wildcard भी काम करेगा
  ],
  credentials: true
}));

app.use(express.json());

/* =============================== 
   DEBUG ENV (PROD में हटा सकते हो)
================================ */
console.log("ENV LOADED =>", {
  ADMIN_ID: process.env.ADMIN_ID ? "✅ SET" : "❌ MISSING",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "✅ SET" : "❌ MISSING",
  JWT_SECRET: process.env.JWT_SECRET ? "✅ SET" : "❌ MISSING"
});

/* =============================== 
   HEALTH CHECK - Monitoring के लिए
================================ */
app.get("/", (req, res) => {
  res.json({ 
    status: "BGMI Admin Server ✅", 
    timestamp: new Date().toISOString(),
    endpoints: ["/admin/login", "/admin/verify"]
  });
});

/* =============================== 
   ADMIN LOGIN ✅
================================ */
app.post("/admin/login", (req, res) => {
  const { id, password } = req.body;

  console.log("🚀 LOGIN TRY:", { id, password: password ? "***" : "EMPTY" });

  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
    console.error("❌ ENV MISSING");
    return res.status(500).json({
      success: false,
      message: "Server configuration error"
    });
  }

  if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { role: "admin", id: process.env.ADMIN_ID },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }  // 7 days बढ़ाया
    );

    console.log("✅ ADMIN LOGIN SUCCESS");
    return res.json({
      success: true,
      token,
      message: "Admin login success",
      expiresIn: 604800  // 7 days in seconds
    });
  }

  console.log("❌ LOGIN FAILED");
  return res.status(401).json({
    success: false,
    message: "Wrong Admin Credentials"
  });
});

/* =============================== 
   ADMIN VERIFY (JWT CHECK) ✅
================================ */
app.get("/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
    return res.json({ 
      success: true, 
      user: { role: decoded.role, id: decoded.id } 
    });
  } catch (error) {
    console.log("❌ TOKEN VERIFY FAILED:", error.message);
    return res.status(401).json({ success: false, message: "Token expired or invalid" });
  }
});

/* =============================== 
   SERVER START ✅
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {  // Render के लिए 0.0.0.0 जरूरी
  console.log(`✅ BGMI Admin Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
});
