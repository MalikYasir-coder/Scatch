const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const ownerModel = require("../models/ownermodel");
router.get("/", (req, res) => {
  res.send("Welcome to the Owners API");
});
router.post("/create", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) {
      return res.status(400).send("Full name, email, and password are required.");
    }

    const existingOwner = await ownerModel.findOne({ email });
    if (existingOwner) {
      return res.status(409).send("Owner with this email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newOwner = await ownerModel.create({
      fullname,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      id: newOwner._id,
      fullname: newOwner.fullname,
      email: newOwner.email,
    });
  } catch (err) {
    console.error("Failed to create owner:", err);
    return res.status(500).send("Failed to create owner.");
  }
});

module.exports = router;
