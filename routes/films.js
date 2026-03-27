const express = require('express');
const router = express.Router();
const db = require("../database");
const multer = require('multer');
const path = require('path');
const { requireAuth, getCredentials } = require("../middleware/auth")

const storage = multer.diskStorage({
    destination: (requireAuth, file, cb) => {
        if(file.fieldname === "poster") cb(null, "posters/")
        else if (file.fieldname === "video") cb(null, "videos/")
    },
    filename: (requireAuth, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })


router.get("/film", async (req, res) => {
    const filmId = req.query.filmId;
    const credentials = getCredentials(req);
    const userId = credentials ? credentials.user_id : null;
    const film = await db.getFullFilmById(filmId, userId);

    if (!film) {
        return res.status(404).json({ message: "Film not found" });
    }

    res.json(film);
});

router.get("/getfilms", async (req, res) => {
    const credentials = getCredentials(req);
    const userId = credentials ? credentials.user_id : null;
    const role = credentials ? credentials.role : null;

    const {
        offset = 0,
        limit = 12,
        search,
        year,
        country,
        rating,
        durationFrom,
        durationTo
    } = req.query;

    let query = `SELECT films.film_id, films.title, films.poster, films.year, films.country, films.duration,
                    AVG(ratings.rating) as average_rating
                FROM films
                LEFT JOIN ratings ON films.film_id = ratings.film_id
                WHERE 1=1`;    
    const params = [];

    if(search) {
        query += ` AND title LIKE ?`;
        params.push(`%${search}%`);
    }
    if(year) {
        query += ` AND year = ?`;
        params.push(year);
    }
    if(country) {
        query += ` AND country = ?`;
        params.push(country);
    }
    if(durationFrom) {
        query += ` AND duration >= ?`;
        params.push(durationFrom);
    }
    if(durationTo) {
        query += ` AND duration <= ?`;
        params.push(durationTo);
    }
    
    query += ` GROUP BY films.film_id`;

    if(rating && rating != "any") {
        query += ` HAVING average_rating >= ?`;
        params.push(rating);
    }

    query += ` ORDER BY films.film_id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);


    try {
        const films = await db.getFilms(query, params);

        let countQuery = `SELECT COUNT(*) as total FROM films WHERE 1=1`;
        const countParams = [];

        if(search){
            countQuery += ` AND title LIKE ?`;
            countParams.push(`%${search}%`);
        } 
        if(year){
            countQuery += ` AND year = ?`;
            countParams.push(year);
        } 
        if(country){
            countQuery += ` AND country = ?`;
            countParams.push(country);
        } 
        if(durationFrom){
            countQuery += ` AND duration >= ?`; countParams.push(durationFrom);
        } 
        if(durationTo){
            countQuery += ` AND duration <= ?`;
            countParams.push(durationTo);
        } 

        const res2 = await db.getFilmsCount(countQuery, countParams);
        const totalCount = res2.total;

        res.json({ films, userId, role, totalCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }

});

router.get("/genres", async (req, res) => {
    const genres = await db.getGenres();
    res.json(genres);
});

router.post("/addFilm", upload.fields([{ name: "poster", maxCount: 1 },
    { name: "videp", maxCount: 1 }]), 
    async (req, res) => {
  try {
    const film = req.body;
    const posterPath = "/poster/" + req.files['poster'][0].filename;
    const videoPath = "/video/" + req.files['video'][0].filename;

    const genres = JSON.parse(film.genres)
    const actors = JSON.parse(film.actors)
    const directors = JSON.parse(film.directors)

    const filmId = await db.createFilm(
        film.title,
        film.description,
        film.year,
        film.duration,
        film.country,
        film.poster,
        posterPath,
        videoPath
    );


    if (genres && genres.length > 0) {
        await db.addGenresToFilm(filmId, genres);
    }

    if (actors && actors.length > 0) {
        for (let i = 0; i < actors.length; i++) {
            const name = actors[i];
            let actor = await db.getActorIdByName(name);
            let actorId;
            if (!actor) {
                actorId = await db.addActor(name);
            } else {
                actorId = actor.actor_id;
            }
            await db.addActorToFilm(filmId, actorId);
        }
    }

    if (directors && directors.length > 0) {
        for (let i = 0; i < directors.length; i++) {
            const name = directors[i];
            let director = await db.getDirectorIdByName(name);
            let directorId;
            if (!director) {
                directorId = await db.addDirector(name);
            } else {
                directorId = director.director_id;
            }
            await db.addDirectorToFilm(filmId, directorId);
        }
    }

    res.json({ filmId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/setRating", requireAuth, async (req, res) => {
  const { filmId, rating } = req.body;

  await db.addRating(req.user.user_id, filmId, rating);

  res.sendStatus(200);
});



module.exports = router;