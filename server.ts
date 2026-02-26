// server.ts
import path from "path";
import dotenv from "dotenv";

// 1️⃣ Load env immediately
dotenv.config({ path: path.resolve(__dirname, ".env") });

// 2️⃣ Now import everything else
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRoutes from "./src/routes/authRoutes";
import userRoutes from "./src/routes/userRoutes";
import medicalRoutes from "./src/routes/medicalRoutes";
import db from "./src/db";

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.get("/", (req, res) => {
    res.send("HID Backend API running!");
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/medical", medicalRoutes);

app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

app.listen(PORT, async () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    try {
        await db.query("SELECT 1");
        console.log("✅ Database connected!");
    } catch (err: any) {
        console.error("❌ DB connection failed:", err.message);
    }
});
