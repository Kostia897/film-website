const express = require('express');
const router = express.Router();
const db = require("../database")

router.get("/comments", async (req, res) => {
  const { filmId, offset = 0, limit = 10 } = req.query;
  const comments = await db.getCommentsFromFilm(filmId, limit, offset);
  const totalCount = await db.getCommentsCountFromFilm(filmId);

  res.json({ comments, totalCount });
});

module.exports = router;