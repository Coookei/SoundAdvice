// csrf protection
import crypto from 'crypto'; 

// parse cookies manually - from header into request cookies 
export function parseCookies(req, _res, next) {
    req.cookies = {};

    const header = req.headers.cookie;

    // no cookies 
    if (!header) {
        return next(); 
    }

    // split cookie string + extract key value pairs 
    header.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('='); 
        req.cookies[name] = decodeURIComponent(rest.join('=')); 
    });

    next(); 
}

// attach csrf token cookie if one doesn't already exist 
export function attachCSRFCookie(req, res, next) {
    if (!req.cookies?.csrf_token) {
        // generates secure token 
        const token = crypto.randomBytes(32).toString('hex'); 

        // sends token as cookie 
        res.cookie('csrf_token', token, {
            httpOnly: false, // js can read cookie - needed to send in header 
            secure: false, // ensures cookies only sent over secure sites - only false due to localhost
            sameSite: 'lax', // ensures cookies sent from same site 
            path: '/' // cookie available across whole site 
        }); 
    }
    next(); 
}

// csrf protection 
export function csrfProtection(req, res, next) {
    // only protect unsafe methods 
    const unsafe = ['POST', 'PUT', 'DELETE', 'PATCH'];

    if (!unsafe.includes(req.method)) {
        return next(); 
    }

    // check request origin matches server host 
    const origin = req.headers.origin;
    const host = req.headers.host; 

    // no origin 
    if (!origin) {
        return res.status(403).json({ error: 'Missing origin' }); 
    }

    // checks for origin 
    try {
        if (new URL(origin).host !== host) {
            return res.status(403).json({ error: 'Bad origin' }); 
        }
    } catch {
        return res.status(403).json({ error: 'Invalid origin' }); 
    }

    // double submit cookie check
    // client must send CSRF token in both cookie and header 
    const cookieToken = req.cookies?.csrf_token;
    const headerToken = req.headers['x-csrf-token']; 

    // tokens don't match 
    if (!cookieToken || !headerToken) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // convert hex to buffers - safe comparison 
    const cookieBuff = Buffer.from(cookieToken, 'hex');
    const headerBuff = Buffer.from(headerToken, 'hex'); 

    // timinig safe comparison - prevents timing attacks 
    if (
        cookieBuff.length !== headerBuff.length ||
        !crypto.timingSafeEqual(cookieBuff, headerBuff)
    ) {
        return res.status(403).json({ error: 'Invalid CSRF token' }); 
    }

    // valid token - allow new request 
    next();
}

// fetch csrf token
export function csrfFetch(url, options = {}) {

    // extract csrf token from browser cookies
    const token = document.cookie
        .split('; ') // split into individual cookies
        .find(c => c.startsWith('csrf_token')) // find csrf token cookie 
        ?.split('=')[1]; // extract the value after the '=' 

    return fetch(url, {
        ...options, // include any options passed in 
        credentials: 'include', // ensures cookies are sent with request 
        headers: {
            ...options.headers, // preserves any existing headers
            'x-csrf-token': token // attach csrf token as custom header - to be compared to csrf_token cookie 
        } 
    }); 
}