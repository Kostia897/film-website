const http = require("http");
const path = require("path");
const { Server } = require ("socket.io")
const crypto = require('crypto')
const db = require('./database');
const cookie = require('cookie')
const express = require('express');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


let validAuthTokens = []


app.use(express.static('static'))
app.use(express.json())


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.get("/login", (req, res) => {
     res.sendFile(path.join(__dirname, "static", "login.html"));
});

app.get("/register", (req, res) => {
     res.sendFile(path.join(__dirname, "static", "register.html"));
});

app.get("/film", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "film.html"));
});

app.get("/addfilm", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "addfilm.html"));
});

app.use("/video", express.static(path.join(__dirname, "videos")));

app.post("/api/login", async (req, res) => {
    try {
        const user = req.body.content;
        const token = await db.getAuthToken(user);

        validAuthTokens.push(token);
        res.json(token);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/register", async (req, res) => {
  const data = req.body.content;
  const exists = await db.userExists(data.login);

  if (!exists) {
    const salt = crypto.randomBytes(16).toString("hex");
    const password = crypto.pbkdf2Sync(data.password, salt, 1000, 64, "sha512").toString("hex");

    await db.addUser(data.login, password, data.avatar, salt, "user");
  }

  res.json(exists);
});

app.get("/api/film", async (req, res) => {
    const filmId = req.query.filmId;
    const credentials = getCredentials(req);
    const userId = credentials ? credentials.user_id : null;
    const film = await db.getFullFilmById(filmId, userId);

    if (!film) {
        return res.status(404).json({ message: "Film not found" });
    }

    res.json(film);
});

app.get("/api/getfilms", async (req, res) => {
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

    query += ` ORDER BY film_id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);


    try {
        const films = await db.all(query, params);

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

        const res2 = await db.get(countQuery, countParams);
        const totalCount = res2.total;

        res.json({ films, userId: null, role: null, totalCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }

});

app.get("/api/comments", async (req, res) => {
  const { filmId, offset = 0, limit = 10 } = req.query;
  const comments = await db.getCommentsFromFilm(filmId, limit, offset);
  const totalCount = await db.getCommentsCountFromFilm(filmId);

  res.json({ comments, totalCount });
});

app.post("/api/addFilm", async (req, res) => {
  try {
    const film = req.body;
    const filmId = await db.createFilm(
        film.title,
        film.description,
        film.year,
        film.duration,
        film.country,
        film.poster
    );

    res.json({ filmId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/setRating", requireAuth, async (req, res) => {
  const { filmId, rating } = req.body;

  await db.addRating(req.user.user_id, filmId, rating);

  res.sendStatus(200);
});


server.listen(3000, () => {
  console.log('Server on http://localhost:3000');
});

function getCredentials(req) {
    const parsedCookies = cookie.parse(req.headers.cookie || "");
    const token = parsedCookies.token;


    if (!token || !validAuthTokens.includes(token)) {
        return null;
    }

    const [user_id, login, role] = token.split(".");

    if (!user_id || !login) {
        return null;
    }

    return { user_id, login, role };
}

function requireAuth(req, res, next) {
    const credentials = getCredentials(req);

    if (!credentials) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = credentials;
    next();
}


function getCredentialsFromCookie(cookieStr = "") {
    const parsedCookies = cookie.parse(cookieStr || "");
    const token = parsedCookies.token;

    if (!token || !validAuthTokens.includes(token)) return null;

    const [user_id, login, role] = token.split(".");
    if (!user_id || !login) return null;

    return { user_id, login, role };
}


io.use((socket, next) => {
    const cookie = socket.handshake.auth.cookie;
    const credentials = getCredentialsFromCookie(cookie);
    if(!credentials) {
        return next(new Error("no auth"));
    }
    socket.credentials = credentials;
    next();
})

io.on('connection', (socket) => {
    const userNickname = socket.credentials.login;
    const userId = socket.credentials.user_id;

    socket.on('new_message', async (content, dialogId) => {
        const now = new Date().toISOString();
        await db.addComment(content, userId, dialogId, now);
    
        io.emit('message', {
            content: content,
            author_id: userId,
            dialog_id: dialogId,
            login: userNickname,
            date: now
        });
    });

})