// Import bibliotek
const express = require('express');
const router = express.Router();

// Import middlewarów
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Import kontrolera z logiką obsługi endpointów
const controller = require('../controllers/continentsController');

// Definicja endpointów i powiązanie ich z funkcjami kontrolera

/**
 * @swagger
 * tags:
 *   name: Continents
 *   description: Operacje na kontynentach
 */

/**
 * @swagger
 * /continents:
 *   get:
 *     summary: Pobieranie wszystkich kontynentów z obsługą sortowania, wyszukiwania i paginacji
 *     tags: [Continents]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Wyszukiwanie po nazwie kontynentu
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: id
 *         description: Sortowanie po kolumnie (id, name, description, area)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Kolejność sortowania
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
 *           default: 3
 *         description: Liczba wyników na stronę
 *     responses:
 *       200:
 *         description: Pobrano kontynenty. / Nie znaleziono żadnych kontynentów.
 *       500:
 *         description: Błąd serwera podczas pobierania kontynentów.
 */
router.get('/', controller.getAllContinents);

/**
 * @swagger
 * /continents/{id}:
 *   get:
 *     summary: Pobieranie jednego kontynentu
 *     tags: [Continents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kontynentu
 *     responses:
 *       200:
 *         description: Pobrano jeden kontynent.
 *       400:
 *         description: Nieprawidłowy ID kontynentu.
 *       404:
 *         description: Kontynent o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania kontynentu.
 */
router.get('/:id', controller.getContinent);

/**
 * @swagger
 * /continents:
 *   post:
 *     summary: Dodawanie nowego kontynentu
 *     tags: [Continents]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: not null unique
 *               description:
 *                 type: string
 *               area:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Nowy kontynent dodany.
 *       400:
 *         description: Brak wymaganych danych. / Parametr 'area' musi być liczbą. / Parametr 'area' musi być większy od zera.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       409:
 *         description: Kontynent o podanej nazwie już istnieje.
 *       500:
 *         description: Błąd serwera podczas dodawania kontynentu.
 */
router.post('/', verifyToken, isAdmin, controller.addContinent);

/**
 * @swagger
 * /continents/{id}:
 *   put:
 *     summary: Aktualizacja kontynentu
 *     tags: [Continents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kontynentu
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
 *     responses:
 *       200:
 *         description: Kontynent zaktualizowany.
 *       400:
 *         description: Brak jakichkolwiek danych. / Parametr 'area' musi być liczbą. / Parametr 'area' musi być większy od zera. / Nieprawidłowy ID kontynentu.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Kontynent o podanym ID nie istnieje.
 *       409:
 *         description: Kontynent o podanej nazwie już istnieje.
 *       500:
 *         description: Błąd serwera podczas aktualizacji kontynentu.
 */
router.put('/:id', verifyToken, isAdmin, controller.updateContinent);

/**
 * @swagger
 * /continents/{id}:
 *   delete:
 *     summary: Usuwanie kontynentu
 *     tags: [Continents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kontynentu
 *     responses:
 *       200:
 *         description: Kontynent usunięty.
 *       400:
 *         description: Nie można usunąć kontynentu, który ma przypisane kraje z przypisanymi wycieczkami. / Nie można usunąć kontynentu, który ma przypisane kraje. / Nieprawidłowy ID kontynentu.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Kontynent o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas usuwania kontynentu. / Błąd serwera podczas pobierania ilości krajów. / Błąd serwera podczas pobierania ilości wycieczek.
 */
router.delete('/:id', verifyToken, isAdmin, controller.deleteContinent);

router.get('/report/pdf', verifyToken, isAdmin, controller.generateContinentsPDF);

// Eksport routera
module.exports = router;