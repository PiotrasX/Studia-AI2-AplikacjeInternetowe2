// Import bibliotek
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Klucz JWT
const JWT_SECRET = process.env.JWT_SECRET || 'domyslny_tajny_klucz';

// Middleware sprawdzający, czy użytkownik jest zalogowany
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Nieprawidłowy lub wygasły token autoryzacyjny.' });
        req.user = user;
        next();
    });
};

// Funkcja pomocnicza sprawdzająca, czy użytkownik jest administratorem
function isUserAdmin(user) {
    return user && user.role === 'admin';
}

// Middleware sprawdzający, czy użytkownik ma rolę administratora
exports.isAdmin = (req, res, next) => {
    if (!isUserAdmin(req.user)) return res.status(403).json({ error: 'Nie posiadasz uprawnień administratora.' });
    next();
};

// Middleware sprawdzający, czy użytkownik ma rolę administratora lub odwołuje się do własnego ID
exports.isAdminOrSelf = (req, res, next) => {
    const loggedUser = req.user;
    const requestedUserId = Number(req.params.user_id);
    if (isUserAdmin(loggedUser) || loggedUser.id === requestedUserId) return next();
    return res.status(403).json({ error: 'Nie posiadasz uprawnień do tych danych.' });
};