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

// ✅ Trust proxy so secure cookies work on Render
app.set("trust proxy", 1);

// ✅ Middleware setup
app.use(cookieParser());
app.use(express.json());

// ✅ Allow both Vercel frontends
const allowedOrigins = [
  "https://n-notes-eight.vercel.app",
  "https://n-notes-mobile.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ Persistent PostgreSQL-backed session store
const PgStore = connectPgSimple(session);

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
      secure: true,       // only over HTTPS
      sameSite: "none",   // required for OAuth and cross-site
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

// ✅ Initialize Passport for Google OAuth
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/api/notes", notesRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("✅ Backend running fine with persistent, first-party sessions!");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export { pool };
