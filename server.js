const http = require('http');
const fs = require('fs')
const path = require('path');
const { Server } = require ("socket.io")
const crypto = require('crypto')
const db = require('./database');
const cookie = require('cookie')

let validAuthTokens = []


const indexHtmlPath = path.join(__dirname, 'static', 'index.html');
const indexHtmlFile = fs.readFileSync(indexHtmlPath);

const indexJsPath = path.join(__dirname, 'static', 'index.js');
const indexJsFile = fs.readFileSync(indexJsPath);

const registerHtmlPath = path.join(__dirname, 'static', 'register.html');
const registerHtmlFile = fs.readFileSync(registerHtmlPath);

const registerJsPath = path.join(__dirname, 'static', 'register.js');
const registerJsFile = fs.readFileSync(registerJsPath);

const loginHtmlPath = path.join(__dirname, 'static', 'login.html');
const loginHtmlFile = fs.readFileSync(loginHtmlPath);

const loginJsPath = path.join(__dirname, 'static', 'login.js');
const loginJsFile = fs.readFileSync(loginJsPath);

const filmHtmlPath = path.join(__dirname, 'static', 'film.html');
const filmHtmlFile = fs.readFileSync(filmHtmlPath);

const filmJsPath = path.join(__dirname, 'static', 'film.js');
const filmJsFile = fs.readFileSync(filmJsPath);

const addfilmHtmlPath = path.join(__dirname, 'static', 'addfilm.html');
const addfilmHtmlFile = fs.readFileSync(addfilmHtmlPath);

const addfilmJsPath = path.join(__dirname, 'static', 'addfilm.js');
const addfilmJsFile = fs.readFileSync(addfilmJsPath);

const server = http.createServer(async (req, res) => {
    if(req.url === '/') {
        return res.end(indexHtmlFile);
    }
    else if(req.url === '/index.js'){
        return res.end(indexJsFile)
    }
    else if(req.url === '/register'){
        return res.end(registerHtmlFile)
    }
    else if(req.url === '/register.js'){
        return res.end(registerJsFile)
    }
    else if(req.url == '/login'){
        return res.end(loginHtmlFile)
    }
    else if(req.url === '/login.js'){
        return res.end(loginJsFile)
    }
    else if(req.url.startsWith('/film?filmId=')){
        return res.end(filmHtmlFile)
    }
    else if(req.url === '/film.js'){
        return res.end(filmJsFile)
    }
    else if(req.url == '/addfilm'){
        return res.end(addfilmHtmlFile)
    }
    else if(req.url === '/addfilm.js'){
        return res.end(addfilmJsFile)
    }
    else if(req.url === '/api/login' && req.method === 'POST'){
        let data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', async function() {
            data = JSON.parse(data);
            const user = data.content
            try {
                const token = await db.getAuthToken(user);
                validAuthTokens.push(token);
                res.writeHead(200)
                res.end(JSON.stringify(token));
            }
            catch(e) {
                res.writeHead(500);
                return res.end(JSON.stringify({message: e.message }));
            }
        })
    }
    else if(req.url === '/api/register'){
        let data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', async function() {
            data = JSON.parse(data);
            const exists = await db.userExists(data.content.login);
            if(!exists){
                const salt = crypto.randomBytes(16).toString('hex')
                const password = crypto.pbkdf2Sync(data.content.password, salt, 1000, 64, `sha512`).toString(`hex`);
                await db.addUser(data.content.login, password, data.content.avatar, salt, 'user')
            }
            return res.end(JSON.stringify(exists));
        })
    }
    else if(req.url.startsWith('/getAvatarUrl?userId=') && req.method === 'GET'){
        const credentionals = guarded(req, res);
        if (!credentionals) return;

        const userId = req.url.split('=')[1];

        const avatarUrl = await db.getAvatarUrl(userId)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ avatar: avatarUrl.avatar }));
    }
    else if(req.url.startsWith('/api/film?filmId=') && req.method === 'GET') {
        const filmId = req.url.split('=')[1];
        const credentials = getCredentionals(req.headers?.cookie);
        const userId = credentials ? credentials.user_id : null;
        const film = await db.getFullFilmById(filmId, userId);

        if (!film) {
            res.writeHead(404);
            return res.end(JSON.stringify({ message: "Film not found" }));
        }
        console.log(film)
        res.writeHead(200, {'Content-Type':'application/json'});
        return res.end(JSON.stringify(film));
    }
    else if (req.url === '/api/setRating' && req.method === 'POST') {
        const credentials = guarded(req,res)

        if (!credentials) {
            res.writeHead(401);
            return res.end();
        }

        let data = '';
        req.on('data', chunk => data += chunk);

        req.on('end', async () => {
            const film = JSON.parse(data);
            console.log('rating:' +film.rating)
            await db.addRating(credentials.user_id, film.filmId, film.rating);

            res.writeHead(200);
            res.end();
        });
    }
    else if (req.url === '/api/addFilm' && req.method === 'POST') {
        // const credentials = guarded(req, res);
        // if (!credentials) return;


        let data = '';
        req.on('data', chunk => data += chunk);

        req.on('end', async () => {
            try {
                const film = JSON.parse(data);

                const filmId = await db.createFilm(
                    film.title,
                    film.description,
                    film.year,
                    film.duration,
                    film.country,
                    film.poster
                );
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ filmId }));

            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ message: e.message }));
            }
        });
    }
    else if(req.url.startsWith('/video/')){
        const fileName = decodeURIComponent(req.url.replace('/video/', ''));
        const videoPath = path.join(__dirname, 'videos', fileName);

        if (!fs.existsSync(videoPath)) {
            res.writeHead(404);
            return res.end('Video not found');
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4',
            });
            fs.createReadStream(videoPath, { start, end }).pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            });
            fs.createReadStream(videoPath).pipe(res);
        }
        return;
    }
    else if(req.url.startsWith('/api/getfilms') && req.method === 'GET'){
        const url = new URL(req.url, `http://${req.headers.host}`);

        const offset = Number(url.searchParams.get('offset'));
        const limit = Number(url.searchParams.get('limit'));
        const search = url.searchParams.get('search');

        const credentials = getCredentionals(req.headers?.cookie);
        const userId = credentials ? credentials.user_id : null;
        const role = credentials ? credentials.role : null;
        let films;
        let total;

        if(search) {
            films = await db.searchFilmsByTitle(search, limit, offset);
            total = await db.getSearchFilmsCount(search);
        } else {
            films = await db.getFilms(limit, offset);
            const totalCount = await db.getFilmsCount();
            total = totalCount[0].total;
        }

        if (!films) {
            res.writeHead(404);
            return res.end(JSON.stringify({ message: "Films not found" }));
        }

        res.writeHead(200, {'Content-Type':'application/json'});
        return res.end(JSON.stringify({films, userId, totalCount: total, role: role}));
    }
    else if(req.url.startsWith('/api/comments') && req.method === 'GET'){
        const url = new URL(req.url, `http://${req.headers.host}`);

        const filmId = Number(url.searchParams.get('filmId'));
        const offset = Number(url.searchParams.get('offset'));
        const limit = Number(url.searchParams.get('limit'));

        const comments = await db.getCommentsFromFilm(filmId, limit, offset);
        const totalCount = await db.getCommentsCountFromFilm(filmId);

        res.writeHead(200, {'Content-Type':'application/json'});
        return res.end(JSON.stringify({comments, totalCount}));
    }
    else {
        res.writeHead(404);
        res.end("Not Found");   
    }
})

server.listen(3000)




function getCredentionals(cookies = ""){
    const parsedCookies = cookie.parse(cookies);
    const token = parsedCookies?.token;

    if(!token || !validAuthTokens.includes(token)){
        return null;
    }
    const [user_id, login, role] = token.split(".");

    if(!user_id || !login){
        return null;
    }

    return{user_id, login, role}
}

function guarded(req,res) {
    const credentionals = getCredentionals(req.headers?.cookie);
    if(!credentionals) {
        res.writeHead(401, {'Location': '/login'});
        return res.end()
    }
    return credentionals
}

const io = new Server(server)

io.use((socket, next) => {
    const cookie = socket.handshake.auth.cookie;
    const credentionals = getCredentionals(cookie);
    if(!credentionals) {
        return next(new Error("no auth"));
    }
    socket.credentionals = credentionals;
    next();
})

io.on('connection', (socket) => {
    const userNickname = socket.credentionals.login;
    const userId = socket.credentionals.user_id;

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