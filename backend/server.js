import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();
import { pool } from "./db.js";
import "./config/passport.js";

import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notes.js";

const app = express();
app.set("trust proxy", 1);

app.use(cookieParser());
app.use(express.json());

// ✅ Multiple frontend origins allowed (comma-separated in .env)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server or mobile requests (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 Blocked by CORS: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/api/notes", notesRoutes);

app.get("/", (req, res) => res.send("✅ Backend is running fine!"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

export { pool };
