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
    else if(req.url === '/api/login'){
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
                await db.addUser(data.content.login, password, data.content.avatar, salt)
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
    else {
        guarded(req,res) 
    }
    
    
})

server.listen(3000)




function getCredentionals(cookies = ""){
    const parsedCookies = cookie.parse(cookies);
    const token = parsedCookies?.token;

    if(!token || !validAuthTokens.includes(token)){
        return null;
    }
    const [user_id, login] = token.split(".");

    if(!user_id || !login){
        return null;
    }

    return{user_id, login}
}
