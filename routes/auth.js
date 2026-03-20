const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');
const { validAuthTokens } = require('../middleware/auth')

router.post("/register", async (req, res) => {
  const data = req.body.content;
  const exists = await db.userExists(data.login);

  if (!exists) {
    const salt = crypto.randomBytes(16).toString("hex");
    const password = crypto.pbkdf2Sync(data.password, salt, 1000, 64, "sha512").toString("hex");

    await db.addUser(data.login, password, data.avatar, salt, "user");
  }

  res.json(exists);
});

router.post("/login", async (req, res) => {
    try {
        const user = req.body.content;
        const token = await db.getAuthToken(user);

        validAuthTokens.push(token);
        res.json(token);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;