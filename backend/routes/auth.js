import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect(process.env.CLIENT_URL)
);

router.get("/me", (req, res) => {
  res.json(req.isAuthenticated()
    ? { loggedIn: true, user: req.user }
    : { loggedIn: false });
});

router.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

export default router;
