// Import bibliotek
const express = require('express');
const router = express.Router();

// Import middlewarów
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Import kontrolera z logiką obsługi endpointów
const controller = require('../controllers/usersController');

// Definicja endpointów i powiązanie ich z funkcjami kontrolera

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Operacje na użytkownikach
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Pobieranie wszystkich użytkowników z obsługą filtrowania, sortowania, wyszukiwania i paginacji
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Wyszukiwanie po adresie e-mail, imieniu lub nazwisku
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: id
 *         description: Sortowanie po kolumnie (id, first_name, last_name, email, role)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Kolejność sortowania
 *       - in: query
 *         name: first_name
 *         schema:
 *           type: string
 *         description: Filtrowanie po imieniu
 *       - in: query
 *         name: last_name
 *         schema:
 *           type: string
 *         description: Filtrowanie po nazwisku
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filtrowanie po adresie e-mail
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filtrowanie po roli
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numer strony
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Liczba wyników na stronę
 *     responses:
 *       200:
 *         description: Pobrano użytkowników. / Nie znaleziono żadnych użytkowników.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       500:
 *         description: Błąd serwera podczas pobierania użytkowników.
 */
router.get('/', verifyToken, isAdmin, controller.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Pobieranie jednego użytkownika
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID użytkownika
 *     responses:
 *       200:
 *         description: Pobrano jednego użytkownika.
 *       400:
 *         description: Nieprawidłowy ID użytkownika.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Użytkownik o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania użytkownika.
 */
router.get('/:id', verifyToken, isAdmin, controller.getUser);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Dodawanie nowego użytkownika
 *     tags: [Users]
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
 *         description: Nowy użytkownik dodany.
 *       400:
 *         description: Brak wymaganych danych. / Nieprawidłowa rola użytkownika. / Nieprawidłowy adres e-mail.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       409:
 *         description: Użytkownik o podanym adresie e-mail już istnieje.
 *       500:
 *         description: Błąd serwera podczas dodawania użytkownika.
 */
router.post('/', verifyToken, isAdmin, controller.addUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Aktualizacja użytkownika
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID użytkownika
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 description: unique
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 default: user
 *     responses:
 *       200:
 *         description: Użytkownik zaktualizowany.
 *       400:
 *         description: Brak jakichkolwiek danych. / Nieprawidłowa rola użytkownika. / Nieprawidłowy adres e-mail. / Nieprawidłowy ID użytkownika.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora. / Nie można zdegradować swojego własnego konta. / Nie można zdegradować innego administratora.
 *       404:
 *         description: Użytkownik o podanym ID nie istnieje.
 *       409:
 *         description: Użytkownik o podanym adresie e-mail już istnieje.
 *       500:
 *         description: Błąd serwera podczas aktualizacji użytkownika. / Błąd serwera podczas pobierania użytkownika.
 */
router.put('/:id', verifyToken, isAdmin, controller.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Usuwanie użytkownika
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID użytkownika
 *     responses:
 *       200:
 *         description: Użytkownik usunięty.
 *       400:
 *         description: Nieprawidłowy ID użytkownika. / Nie można usunąć użytkownika, który posiada rezerwacje.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora. / Nie można usunąć swojego własnego konta. / Nie można usunąć innego administratora.
 *       404:
 *         description: Użytkownik o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas usuwania użytkownika. / Błąd serwera podczas pobierania rezerwacji użytkownika. / Błąd serwera podczas pobierania użytkownika.
 */
router.delete('/:id', verifyToken, isAdmin, controller.deleteUser);

/**
 * @swagger
 * /users/profile/me:
 *   get:
 *     summary: Pobieranie własnych danych zalogowanego użytkownika
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pobrano profil użytkownika.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny.
 *       404:
 *         description: Nie znaleziono profilu użytkownika.
 *       500:
 *         description: Błąd serwera podczas pobierania profilu użytkownika.
 */
router.get('/profile/me', verifyToken, controller.getOwnProfile);

/**
 * @swagger
 * /users/profile/me:
 *   put:
 *     summary: Aktualizacja własnych danych zalogowanego użytkownika
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 description: unique
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil użytkownika zaktualizowany.
 *       400:
 *         description: Brak jakichkolwiek danych. / Nieprawidłowy adres e-mail.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny.
 *       409:
 *         description: Użytkownik o podanym adresie e-mail już istnieje.
 *       500:
 *         description: Błąd serwera podczas aktualizacji profilu użytkownika.
 */
router.put('/profile/me', verifyToken, controller.updateOwnProfile);

router.get('/report/pdf', verifyToken, isAdmin, controller.generateUsersPDF);

// Eksport routera
module.exports = router;