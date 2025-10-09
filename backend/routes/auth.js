import express from "express";
import passport from "passport";

const router = express.Router();

// Start Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google callback
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL || "http://localhost:5173");
  }
);

// Auth status endpoint
router.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ loggedIn: true, user: req.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout endpoint
router.get("/logout", (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

export default router;
