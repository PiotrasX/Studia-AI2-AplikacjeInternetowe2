// Import połączenia z bazą danych
const db = require('../db/database');

// Import bibliotek
const { logAction } = require('../utils/logger');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Klucz JWT
const JWT_SECRET = process.env.JWT_SECRET || 'domyslny_tajny_klucz';

// Pomocnicza funkcja do walidacji i standaryzacji adresu e-mail
function validateAndNormalizeEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(normalized)) return null;
    return normalized;
}

// Rejestracja użytkownika
exports.register = (req, res) => {
    // Pobranie parametrów przesłanych w ciele żądania
    const { first_name, last_name, email, password, role = 'user' } = req.body;

    // Walidacja wymaganych danych
    if (!first_name || !last_name || !email || !password) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    // Walidacja typów danych
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Nieprawidłowa rola użytkownika.' });

    const normalizedEmail = validateAndNormalizeEmail(email);
    if (!normalizedEmail) return res.status(400).json({ error: 'Nieprawidłowy adres e-mail.' });

    // Wykonanie zapytania do pobrania użytkownika w celu sprawdzenia duplikatu
    db.get(
        'SELECT id FROM users WHERE email = ?',
        [normalizedEmail],
        (err, existingUser) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
            if (existingUser) return res.status(409).json({ error: 'Użytkownik o podanym adresie e-mail już istnieje.' });

            // Haszowanie hasła
            const hashedPassword = bcrypt.hashSync(password, 10);

            // Wykonanie polecenia do rejestracji użytkownika
            db.run(
                'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                [first_name, last_name, normalizedEmail, hashedPassword, role],
                function (err) {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas rejestracji użytkownika.' });

                    // Tworzenie tokenu JWT
                    const token = jwt.sign(
                        { id: this.lastID, email: normalizedEmail, role },
                        JWT_SECRET,
                        { expiresIn: '2h' }
                    );

                    // Log - rejestracja
                    logAction(
                        { id: this.lastID, email: normalizedEmail },
                        'REGISTER',
                        `Zarejestrowano użytkownika: ${first_name} ${last_name}`
                    );

                    res.status(201).json({ message: 'Użytkownik zarejestrowany.', user: { id: this.lastID, first_name, last_name, email, role }, token });
                }
            );
        }
    );
};

// Logowanie użytkownika
exports.login = (req, res) => {
    // Pobranie parametrów przesłanych w ciele żądania
    const { email, password } = req.body;

    // Walidacja wymaganych danych
    if (!email || !password) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    const normalizedEmail = validateAndNormalizeEmail(email);
    if (!normalizedEmail) return res.status(400).json({ error: 'Nieprawidłowy adres e-mail.' });

    // Wykonanie zapytania do logowania użytkownika
    db.get(
        'SELECT * FROM users WHERE email = ?',
        [normalizedEmail],
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas logowania użytkownika.' });
            if (!user) return res.status(401).json({ error: 'Nieprawidłowy adres e-mail lub hasło.' });

            // Sprawdzenie hasła
            const passwordMatch = bcrypt.compareSync(password, user.password);
            if (!passwordMatch) return res.status(401).json({ error: 'Nieprawidłowy adres e-mail lub hasło.' });

            // Tworzenie tokenu JWT
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '2h' }
            );

            // Log - logowanie
            logAction(
                { id: user.id, email: user.email },
                'LOGIN',
                `Zalogowano użytkownika: ${user.first_name} ${user.last_name}`
            );

            res.status(200).json({ message: 'Użytkownik zalogowany.', user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role }, token });
        }
    );
};

// Weryfikacja tokenu JWT (middleware)
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

// Log do wylogowania użytkownika
exports.logout = (req, res) => {
    db.get(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            let desc = `Wylogowano użytkownika z ID ${req.user.id}`;
            if (user) desc = `Wylogowano użytkownika: ${user.first_name} ${user.last_name}`;

            logAction(
                req.user,
                'LOGOUT',
                desc
            );

            res.status(200).json({ message: 'Użytkownik wylogowany.' });
        }
    )
};