// src/loadEnv.ts
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

console.log("🔥 ENV LOADED:", process.env.JWT_SECRET ? "YES" : "NO");
