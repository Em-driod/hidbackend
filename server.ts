// server.ts
import path from "path";
import dotenv from "dotenv";

// 1️⃣ Load env immediately
dotenv.config({ path: path.resolve(__dirname, ".env") });
console.log("🔥 JWT_SECRET:", process.env.JWT_SECRET);

// 2️⃣ Now import everything else
import express from "express";
import authRoutes from "./src/routes/authRoutes";
import userRoutes from "./src/routes/userRoutes";
import medicalRoutes from "./src/routes/medicalRoutes";
import db from "./src/db";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("HID Backend API running!");
});

app.use("/api/auth", authRoutes);
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
