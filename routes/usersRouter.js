const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const userModel = require("../models/usermodel");

router.get("/", (req, res) => {
  res.send("Welcome to the Users API");
});

router.get("/create", (req, res) => {
  res.render("users-create", { error: null });
});

router.post("/create", async (req, res) => {
  try {
    const fullname = req.body.fullname?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!fullname || !email || !password) {
      return res.status(400).render("users-create", {
        error: "Please complete all required fields.",
      });
    }

    if (fullname.length < 3 || password.length < 6) {
      return res.status(400).render("users-create", {
        error: "Name must be at least 3 characters and password at least 6.",
      });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).render("users-create", {
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.create({ fullname, email, password: hashedPassword });
    return res.redirect("/users/login?created=1");
  } catch (err) {
    console.error("Failed to create user:", err);
    return res.status(500).render("users-create", {
      error: "Could not create your account. Please try again.",
    });
  }
});

router.get("/login", (req, res) => {
  res.render("users-login", {
    error: null,
    message: req.query.created ? "Your account is ready. Please log in." : null,
  });
});

router.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).render("users-login", {
        error: "Enter your email and password.",
        message: null,
      });
    }

    const user = await userModel.findOne({ email });
    const passwordMatches = user && await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).render("users-login", {
        error: "Email or password is incorrect.",
        message: null,
      });
    }

    return res.status(200).render("users-login", {
      error: null,
      message: `Welcome back, ${user.fullname}. Your credentials were verified.`,
    });
  } catch (err) {
    console.error("Failed to log in user:", err);
    return res.status(500).render("users-login", {
      error: "Could not log in. Please try again.",
      message: null,
    });
  }
});

module.exports = router;
