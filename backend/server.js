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
app.set("trust proxy", 1); // Required for secure cookies on Render

app.use(cookieParser());
app.use(express.json());

// ✅ Only allow mobile frontend + temporary deploy URLs
const allowedOrigins = [
   process.env.CLIENT_URL,  // e.g. https://n-notes-zeta.vercel.app
  "http://localhost:3000" 
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Blocked by CORS"));
      }
    },
    credentials: true,
  })
);

const PgStore = connectPgSimple(session);

app.use(
  session({
    store: new PgStore({ pool, tableName: "session" }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none", // Needed for cross-site cookies
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/api/notes", notesRoutes);

app.get("/", (req, res) => res.send("✅ Backend running fine for mobile app!"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

export { pool };
