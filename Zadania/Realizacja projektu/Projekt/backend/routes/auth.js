// Import bibliotek
const express = require('express');
const router = express.Router();

// Import middleware do sprawdzania, czy użytkownik nie jest zalogowany
const { checkNotAuthenticated } = require('../middleware/checkNotAuthenticated');

// Import kontrolera z logiką obsługi endpointów
const controller = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Rejestracja i logowanie użytkowników
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Rejestracja użytkownika
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *               - password
 *             properties:
 *               first_name:
 *                 type: string
 *                 description: not null
 *               last_name:
 *                 type: string
 *                 description: not null
 *               email:
 *                 type: string
 *                 description: not null unique
 *               password:
 *                 type: string
 *                 description: not null
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 default: user
 *     responses:
 *       201:
 *         description: Użytkownik zarejestrowany.
 *       400:
 *         description: Brak wymaganych danych. / Nieprawidłowa rola użytkownika. / Nieprawidłowy adres e-mail. / Jesteś już zalogowany.
 *       409:
 *         description: Użytkownik o podanym adresie e-mail już istnieje.
 *       500:
 *         description: Błąd serwera podczas rejestracji użytkownika. / Błąd serwera podczas pobierania użytkownika.
 */
router.post('/register', checkNotAuthenticated, controller.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Logowanie użytkownika
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: not null
 *               password:
 *                 type: string
 *                 description: not null
 *     responses:
 *       200:
 *         description: Użytkownik zalogowany.
 *       400:
 *         description: Brak wymaganych danych. / Nieprawidłowy adres e-mail. / Jesteś już zalogowany.
 *       401:
 *         description: Nieprawidłowy adres e-mail lub hasło.
 *       500:
 *         description: Błąd serwera podczas logowania użytkownika.
 */
router.post('/login', checkNotAuthenticated, controller.login);

router.post('/logout', controller.verifyToken, controller.logout);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: Weryfikacja tokenu JWT
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token autoryzacyjny poprawny.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny.
 */
router.get('/verify', controller.verifyToken, (req, res) => {
    res.status(200).json({
        message: 'Token autoryzacyjny poprawny.',
        user: req.user
    });
});

// Eksport routera
module.exports = router;