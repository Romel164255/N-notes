import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectPgSimple from "connect-pg-simple";

dotenv.config();
import { pool } from "./db.js";
import "./config/passport.js";

import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notes.js";

const app = express();

// ✅ Trust proxy for secure cookies
app.set("trust proxy", 1);

app.use(cookieParser());
app.use(express.json());

// ✅ Allow both web + mobile Vercel frontends
app.use(
  cors({
    origin: [
      "https://n-notes-eight.vercel.app",
      "https://n-notes-mobile.vercel.app"
    ],
    credentials: true,
  })
);

const PgStore = connectPgSimple(session);

// ✅ Persistent PostgreSQL-backed session
app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax", // ✅ first-party, persistent
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/api/notes", notesRoutes);

app.get("/", (req, res) =>
  res.send("✅ Backend running fine with persistent, first-party sessions!")
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);

export { pool };
