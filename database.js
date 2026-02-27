const fs = require('fs')
const crypto = require('crypto')

const dbFile = "./chat.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;

dbWrapper
    .open({
        filename:dbFile,
        driver: sqlite3.Database
    })
    .then(async dBase => {
        db = dBase;
        try {
            if (!exists) {
                await db.run(
                    `CREATE TABLE users(
                        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        login TEXT,
                        password TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        avatar TEXT,
                        role TEXT
                    );`
                );
                await db.run(
                    `CREATE TABLE comments(
                        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        content VARCHAR(1000) NOT NULL,
                        created_at TEXT NOT NULL,
                        author_id INTEGER NOT NULL,
                        film_id INTEGER NOT NULL,
                        CONSTRAINT fk_author_id FOREIGN KEY (author_id) REFERENCES users(user_id),
                        CONSTRAINT fk_film_id FOREIGN KEY (film_id) REFERENCES films(film_id)
                    );`
                );
                await db.run(
                    `CREATE TABLE films(
                        film_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        description TEXT,
                        year INTEGER,
                        duration INTEGER,
                        country TEXT,
                        poster TEXT
                    );`
                );
                await db.run(
                    `CREATE TABLE genres(
                        genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL
                    );`
                );
                await db.run(
                    `CREATE TABLE film_genres(
                        film_id INTEGER,
                        genre_id INTEGER,
                        PRIMARY KEY (film_id, genre_id),
                        CONSTRAINT fk_film_id FOREIGN KEY (film_id) REFERENCES films(film_id),
                        CONSTRAINT fk_genre_id FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
                    );`
                );
                await db.run(
                    `CREATE TABLE actors(
                        actor_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL
                    );`
                );
                await db.run(
                    `CREATE TABLE directors(
                        director_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL
                    );`
                );
                await db.run(
                    `CREATE TABLE film_actors(
                        film_id INTEGER,
                        actor_id INTEGER,
                        PRIMARY KEY (film_id, actor_id),
                        CONSTRAINT fk_film_id FOREIGN KEY (film_id) REFERENCES films(film_id),
                        CONSTRAINT fk_actor_id FOREIGN KEY (actor_id) REFERENCES actors(actor_id)
                    );`
                );
                await db.run(
                    `CREATE TABLE film_directors(
                        film_id INTEGER,
                        director_id INTEGER,
                        PRIMARY KEY (film_id, director_id),
                        CONSTRAINT fk_film_id FOREIGN KEY (film_id) REFERENCES films(film_id),
                        CONSTRAINT fk_director_id FOREIGN KEY (director_id) REFERENCES directors(director_id)
                    );`
                );
                await db.run(
                    `CREATE TABLE ratings(
                        rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        film_id INTEGER NOT NULL,
                        rating INTEGER NOT NULL,
                        UNIQUE(user_id, film_id),
                        CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(user_id),
                        CONSTRAINT fk_film_id FOREIGN KEY (film_id) REFERENCES films(film_id)
                    );`
                );
                const salt = crypto.randomBytes(16).toString('hex')
                const password = crypto.pbkdf2Sync(admin, salt, 1000, 64, `sha512`).toString(`hex`);
                await db.addUser('admin', password, '', salt, 'admin')

            } else {
                console.log(await db.all("SELECT * from comments"))
            }
        } catch (dbError) {
            console.error(dbError);
        }
    })


module.exports = {
    getCommentsFromFilm: async (filmId) => {
        try{
            return await db.all(
                `SELECT comments.comment_id,
                        comments.content,
                        comments.created_at,
                        users.login,
                        comments.author_id,
                        comments.film_id
                FROM comments 
                JOIN users ON comments.author_id = users.user_id 
                WHERE comments.film_id = ?;`,
                [filmId]
            );
        } catch (dbError) {
            console.error(dbError);
        }
    },
    addComment: async (content, userId, filmId, created_at) => {
        try{
            await db.run(
                `INSERT INTO comments(content, author_id, film_id, created_at) VALUES (?,?,?,?)`,
                [content, userId, filmId, created_at]
            )
        } catch (dbError) {
            console.error(dbError);
        }
    },
    userExists: async (login) => {
        try{
            const user = await db.all(
                `SELECT * FROM users WHERE login = ?`,
                [login]
            );
            return user.length > 0;
        } catch (dbError) {
            console.log(dbError);
            return false;
        }
    },
    addUser: async (login, password, avatar, salt) => {
        try{
            await db.run(`
                INSERT INTO users(login, password, avatar, salt, role) VALUES(?, ?, ?, ?, ?);`,
                [login, password, avatar, salt, 'user']
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getAuthToken: async (user) => {
        const candidate = await db.all(`SELECT * FROM users WHERE login = ?`, [user.login]);
        if(!candidate.length) {
            throw new Error('Wrong login');
        }
        
        const password = crypto.pbkdf2Sync(user.password, candidate[0].salt, 1000, 64, `sha512`).toString(`hex`);

        if(candidate[0].password !== password) {
            throw new Error('Wrong password');
        }
        console.log(candidate[0])
        const token = candidate[0].user_id + '.' + candidate[0].login + '.' + crypto.randomBytes(20).toString('hex');
        return token;
    },
    getFilms: async () => {
        try{
            return await db.all(
                `SELECT title, poster, film_id
                FROM films
                ;`,
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    findUserByLogin: async (login) => {
        try{
            return await db.get(
                `SELECT user_id, login, avatar FROM users WHERE login = ?`,
                [login]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getFilmById: async (filmId) => {
        try{
            const film = await db.get(
                `SELECT * FROM films
                WHERE film_id = ?`,
                [filmId]
            );

            return film;
        } catch (dbError) {
            console.log(dbError);
        }
    },
    createFilm: async (title, description, year, duration, country, poster) => {
        try{
            const res = await db.run(
                `INSERT INTO films(title, description, year, duration, country, poster)
                VALUES (?, ?, ?, ?, ?, ?);`,
                [title, description, year, duration, country, poster]
            );

            return res.lastID;
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getAvatarUrl: async (userId) => {
        try{
            return await db.get(
                `SELECT avatar FROM users WHERE user_id = ? 
                ;`,
                [userId]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    addRating: async (userId, filmId, rating) => {
        try {
            await db.run(
                `INSERT OR REPLACE INTO ratings(user_id, film_id, rating)
                VALUES (?, ?, ?)`,
                [userId, filmId, rating]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    addActor: async (name) => {
        try {
            const res = await db.run(
                `INSERT INTO actors(name) VALUES (?)`,
                [name]
            );
            return res.lastID;
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getActorIdByName: async(name) => {
        try {
            return await db.get(
                `SELECT actor_id FROM actors WHERE name = ?`,
                [name]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    addActorToFilm: async (filmId, actorId) => {
        try {
            await db.run(
                `INSERT INTO film_actors(film_id, actor_id)
                VALUES (?, ?)`,
                [filmId, actorId]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    addDirector: async (name) => {
        try {
            const res = await db.run(
                `INSERT INTO directors(name) VALUES (?)`,
                [name]
            );
            return res.lastID;
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getDirectorIdByName: async(name) => {
        try {
            return await db.get(
                `SELECT director_id FROM directors WHERE name = ?`,
                [name]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    addDirectorToFilm: async (filmId, directorId) => {
        try {
            await db.run(
                `INSERT INTO film_directors(film_id, director_id)
                VALUES (?, ?)`,
                [filmId, directorId]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getFilmsByYear: async (year) => {
        try {
            return await db.all(
                `SELECT film_id, title, poster
                FROM films
                WHERE year = ?
                ORDER BY title ASC;`,
                [year]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getFullFilmById: async (filmId, userId = null) => {
        const film = await db.get(
            `SELECT * FROM films 
            WHERE films.film_id = ?`,
            [filmId]
        );
        if (!film) {
            return null;
        }

        const genres = await db.all(
            `SELECT genres.name
            FROM genres
            JOIN film_genres
            ON genres.genre_id = film_genres.genre_id
            WHERE film_genres.film_id = ?`,
            [filmId]
        );

        const actors = await db.all(
            `SELECT actors.name
            FROM actors
            JOIN film_actors
            ON actors.actor_id = film_actors.actor_id
            WHERE film_actors.film_id = ?`,
            [filmId]
        );

        const directors = await db.all(
            `SELECT directors.name
            FROM directors
            JOIN film_directors
            ON directors.director_id = film_directors.director_id
            WHERE film_directors.film_id = ?`,
            [filmId]
        );

        const ratingData = await db.get(
            `SELECT 
                AVG(rating) AS avg,
                COUNT(rating) AS quantity
            FROM ratings
            WHERE ratings.film_id = ?`,
            [filmId]
        );

        let userRating = null;

        if (userId) {
            const rating = await db.get(
                `SELECT rating
                FROM ratings
                WHERE ratings.user_id = ? 
                AND ratings.film_id = ?`,
                [userId, filmId]
            );

            if (rating) userRating = rating.rating;
        }

        const genreNames = [];
        for (let i = 0; i < genres.length; i++) {
            genreNames.push(genres[i].name);
        }

        const actorNames = [];
        for (let i = 0; i < actors.length; i++) {
            actorNames.push(actors[i].name);
        }

        const directorNames = [];
        for (let i = 0; i < directors.length; i++) {
            directorNames.push(directors[i].name);
        }

        return {
            film_id: film.film_id,
            title: film.title,
            description: film.description,
            year: film.year,
            duration: film.duration,
            country: film.country,
            poster: film.poster,
            genres: genreNames,
            actors: actorNames,
            directors: directorNames,
            rating: {
                average: ratingData.avg || 0,
                user: userRating,
                quantity: ratingData.quantity || 0
            },
            user_id: userId
        };
    },
}
