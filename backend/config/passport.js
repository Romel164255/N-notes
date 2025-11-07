import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

// ✅ Debug check for environment variable correctness
if (!process.env.GOOGLE_CALLBACK_URL) {
  console.error("❌ Missing GOOGLE_CALLBACK_URL in environment!");
} else {
  console.log("✅ Using Google Callback URL:", process.env.GOOGLE_CALLBACK_URL.trim());
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID?.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
      callbackURL: process.env.GOOGLE_CALLBACK_URL?.trim(),
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleSub = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const name = profile.displayName || null;
        const picture = profile.photos?.[0]?.value || null;

        // Hash Google 'sub' ID for additional security
        const hash = crypto.createHash("sha256").update(googleSub).digest("hex");

        // 🔍 Check if user exists
        let result = await pool.query(
          "SELECT * FROM users WHERE google_sub_hash = $1",
          [hash]
        );

        let user;

        if (result.rows.length === 0) {
          // 🆕 Insert new user
          const insert = await pool.query(
            `INSERT INTO users (google_sub_hash, email, name, google_id, picture, last_seen)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [hash, email, name, googleSub, picture]
          );
          user = insert.rows[0];
          console.log("✅ New user created:", email || name);
        } else {
          user = result.rows[0];
          // 🕓 Update last_seen + picture
          await pool.query(
            "UPDATE users SET last_seen = NOW(), picture = $1 WHERE id = $2",
            [picture, user.id]
          );
          console.log("✅ Existing user logged in:", email || name);
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ GoogleStrategy Error:", err.message);
        return done(err, null);
      }
    }
  )
);

// ✅ Serialize user ID into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// ✅ Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, res.rows[0]);
  } catch (err) {
    console.error("❌ Deserialize Error:", err.message);
    done(err, null);
  }
});

export default passport;
