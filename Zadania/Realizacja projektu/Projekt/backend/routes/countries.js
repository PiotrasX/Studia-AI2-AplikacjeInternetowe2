// Import bibliotek
const express = require('express');
const router = express.Router();

// Import middlewarów
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Import kontrolera z logiką obsługi endpointów
const controller = require('../controllers/countriesController');

// Definicja endpointów i powiązanie ich z funkcjami kontrolera

/**
 * @swagger
 * tags:
 *   name: Countries
 *   description: Operacje na krajach
 */

/**
 * @swagger
 * /countries:
 *   get:
 *     summary: Pobieranie wszystkich krajów z obsługą filtrowania, sortowania, wyszukiwania i paginacji
 *     tags: [Countries]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Wyszukiwanie po nazwie kontynentu lub nazwie kraju
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: id
 *         description: Sortowanie po kolumnie (id, name, description, area, population, continent_name, continent_id)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Kolejność sortowania
 *       - in: query
 *         name: continent_name
 *         schema:
 *           type: string
 *         description: Filtrowanie po nazwie kontynentu
 *       - in: query
 *         name: continent_id
 *         schema:
 *           type: integer
 *         description: Filtrowanie po ID kontynentu
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
 *           default: 10
 *         description: Liczba wyników na stronę
 *     responses:
 *       200:
 *         description: Pobrano kraje. / Nie znaleziono żadnych krajów.
 *       500:
 *         description: Błąd serwera podczas pobierania krajów.
 */
router.get('/', controller.getAllCountries);

/**
 * @swagger
 * /countries/{id}:
 *   get:
 *     summary: Pobieranie jednego kraju
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kraju
 *     responses:
 *       200:
 *         description: Pobrano jeden kraj.
 *       400:
 *         description: Nieprawidłowy ID kraju.
 *       404:
 *         description: Kraj o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania kraju.
 */
router.get('/:id', controller.getCountry);

/**
 * @swagger
 * /countries:
 *   post:
 *     summary: Dodawanie nowego kraju
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - area
 *               - population
 *               - continent_id
 *             properties:
 *               name:
 *                 type: string
 *                 description: not null unique
 *               description:
 *                 type: string
 *               area:
 *                 type: integer
 *                 minimum: 1
 *               population:
 *                 type: integer
 *                 minimum: 1
 *               continent_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Nowy kraj dodany.
 *       400:
 *         description: Brak wymaganych danych. / Parametr 'area' musi być liczbą. / Parametr 'area' musi być większy od zera. / Parametr 'population' musi być liczbą. / Parametr 'population' musi być większy od zera.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Kontynent o podanym ID nie istnieje.
 *       409:
 *         description: Kraj o podanej nazwie już istnieje.
 *       500:
 *         description: Błąd serwera podczas dodawania kraju. / Błąd serwera podczas pobierania kontynentu.
 */
router.post('/', verifyToken, isAdmin, controller.addCountry);

/**
 * @swagger
 * /countries/{id}:
 *   put:
 *     summary: Aktualizacja kraju
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kraju
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: unique
 *               description:
 *                 type: string
 *               area:
 *                 type: integer
 *                 minimum: 1
 *               population:
 *                 type: integer
 *                 minimum: 1
 *               continent_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Kraj zaktualizowany.
 *       400:
 *         description: Brak jakichkolwiek danych. / Parametr 'area' musi być liczbą. / Parametr 'area' musi być większy od zera. / Parametr 'population' musi być liczbą. / Parametr 'population' musi być większy od zera. / Nieprawidłowy ID kraju.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Kraj o podanym ID nie istnieje. / Kontynent o podanym ID nie istnieje.
 *       409:
 *         description: Kraj o podanej nazwie już istnieje.
 *       500:
 *         description: Błąd serwera podczas aktualizowania kraju. / Błąd serwera podczas pobierania kontynentu.
 */
router.put('/:id', verifyToken, isAdmin, controller.updateCountry);

/**
 * @swagger
 * /countries/{id}:
 *   delete:
 *     summary: Usuwanie kraju
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kraju
 *     responses:
 *       200:
 *         description: Kraj usunięty.
 *       400:
 *         description: Nie można usunąć kraju, który ma przypisane wycieczki. / Nieprawidłowy ID kraju.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Kraj o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas usuwania kraju. / Błąd serwera podczas pobierania ilości wycieczek.
 */
router.delete('/:id', verifyToken, isAdmin, controller.deleteCountry);

router.get('/report/pdf', verifyToken, isAdmin, controller.generateCountriesPDF);

// Eksport routera
module.exports = router;