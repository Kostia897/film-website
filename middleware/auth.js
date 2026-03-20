
const cookie = require('cookie')
let validAuthTokens = []

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

function getCredentialsFromCookie(cookieStr = "") {
    const parsedCookies = cookie.parse(cookieStr || "");
    const token = parsedCookies.token;

    if (!token || !validAuthTokens.includes(token)) return null;

    const [user_id, login, role] = token.split(".");
    if (!user_id || !login) return null;

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


module.exports = {
    getCredentials,
    validAuthTokens,
    requireAuth,
    getCredentialsFromCookie
}