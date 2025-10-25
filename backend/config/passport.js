import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleSub = profile.id;
        const hash = crypto.createHash("sha256").update(googleSub).digest("hex");
        const email = profile.emails?.[0]?.value || null;
        const name = profile.displayName || null;
        const picture = profile.photos?.[0]?.value || null; // new: get profile pic

        // Check if user exists
        let result = await pool.query("SELECT * FROM users WHERE google_sub_hash = $1", [hash]);

        if (result.rows.length === 0) {
          // Insert new user with picture
          result = await pool.query(
            `INSERT INTO users (google_sub_hash, email, name, google_id, picture)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [hash, email, name, googleSub, picture]
          );
        } else {
          // Update last_seen and picture if user exists
          await pool.query(
            "UPDATE users SET last_seen = NOW(), picture = $1 WHERE id = $2",
            [picture, result.rows[0].id]
          );
        }

        return done(null, result.rows[0]);
      } catch (err) {
        console.error("❌ GoogleStrategy Error:", err);
        done(err, null);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, res.rows[0]);
  } catch (err) {
    done(err, null);
  }
});
