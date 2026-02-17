// Import bibliotek
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Klucz JWT
const JWT_SECRET = process.env.JWT_SECRET || 'domyslny_tajny_klucz';

// Middleware blokujący dostęp dla zalogowanych użytkowników
exports.checkNotAuthenticated = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return next();
        return res.status(400).json({ error: 'Jesteś już zalogowany.' });
    });
};