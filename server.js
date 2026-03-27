const http = require("http");
const path = require("path");
const { Server } = require ("socket.io")
const express = require('express');
const db = require('./database');

const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comment');
const filmRoutes = require('./routes/films');

const { getCredentialsFromCookie, validAuthTokens } = require("./middleware/auth")

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('static'))
app.use(express.json())


app.use('/api', authRoutes)
app.use('/api', commentRoutes)
app.use('/api', filmRoutes)


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
app.use("/poster", express.static(path.join(__dirname, "posters")));





server.listen(3000, () => {
  console.log('Server on http://localhost:3000');
});




io.use((socket, next) => {
    const cookie = socket.handshake.headers.cookie;
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