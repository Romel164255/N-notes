import express from "express";
import passport from "passport";

const router = express.Router();

// 🧠 Google login entry
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// 🧠 Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    try {
      // ✅ Read allowed frontend URLs from env variable
      const allowedUrls = process.env.CLIENT_URLS
        ? process.env.CLIENT_URLS.split(",").map(url => url.trim())
        : [];

      // ✅ Detect which site started the login (from headers)
      const origin = req.get("origin") || req.get("referer");
      let redirectTo = allowedUrls[0]; // fallback to first in list

      if (origin) {
        const match = allowedUrls.find(url => origin.startsWith(url));
        if (match) redirectTo = match;
      }

      console.log(`🔁 Redirecting user to: ${redirectTo}`);
      res.redirect(redirectTo);
    } catch (error) {
      console.error("❌ Redirect error:", error.message);
      res.redirect(process.env.CLIENT_URL || "/");
    }
  }
);

// 🧠 Get current user session
router.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ loggedIn: true, user: req.user });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});

// 🧠 Logout endpoint
router.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.clearCookie("connect.sid");
    res.status(200).json({ ok: true });
  });
});

export default router;
