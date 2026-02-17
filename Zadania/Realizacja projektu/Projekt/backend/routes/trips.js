// Import bibliotek
const express = require('express');
const router = express.Router();

// Import middlewarów
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Import kontrolera z logiką obsługi endpointów
const controller = require('../controllers/tripsController');

// Definicja endpointów i powiązanie ich z funkcjami kontrolera

/**
 * @swagger
 * tags:
 *   name: Trips
 *   description: Operacje na wycieczkach
 */

/**
 * @swagger
 * /trips:
 *   get:
 *     summary: Pobieranie wszystkich wycieczek z obsługą filtrowania, sortowania, wyszukiwania i paginacji
 *     tags: [Trips]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Wyszukiwanie po nazwie kontynentu, nazwie kraju lub nazwie wycieczki
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: id
 *         description: Sortowanie po kolumnie (id, name, description, period, price, country_name, country_id, continent_name, continent_id)
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
 *         name: country_name
 *         schema:
 *           type: string
 *         description: Filtrowanie po nazwie kraju
 *       - in: query
 *         name: country_id
 *         schema:
 *           type: integer
 *         description: Filtrowanie po ID kraju
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
 *         description: Pobrano wycieczki. / Nie znaleziono żadnych wycieczek.
 *       500:
 *         description: Błąd serwera podczas pobierania wycieczek.
 */
router.get('/', controller.getAllTrips);

/**
 * @swagger
 * /trips/{id}:
 *   get:
 *     summary: Pobieranie jednej wycieczki
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID wycieczki
 *     responses:
 *       200:
 *         description: Pobrano jedną wycieczkę.
 *       400:
 *         description: Nieprawidłowy ID wycieczki.
 *       404:
 *         description: Wycieczka o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania wycieczki.
 */
router.get('/:id', controller.getTrip);

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Dodawanie nowej wycieczki
 *     tags: [Trips]
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
 *               - period
 *               - price
 *               - country_id
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               period:
 *                 type: integer
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 minimum: 1
 *               country_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Nowa wycieczka dodana.
 *       400:
 *         description: Brak wymaganych danych. / Parametr 'period' musi być liczbą. / Parametr 'period' musi być większy od zera. / Parametr 'price' musi być liczbą. / Parametr 'price' musi być większy od zera.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Kraj o podanym ID nie istnieje.
 *       409:
 *         description: Taka wycieczka już istnieje.
 *       500:
 *         description: Błąd serwera podczas dodawania wycieczki. / Błąd serwera podczas pobierania wycieczki. / Błąd serwera podczas pobierania kraju.
 */
router.post('/', verifyToken, isAdmin, controller.addTrip);

/**
 * @swagger
 * /trips/{id}:
 *   put:
 *     summary: Aktualizacja wycieczki
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID wycieczki
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               period:
 *                 type: integer
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 minimum: 1
 *               country_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Wycieczka zaktualizowana.
 *       400:
 *         description: Brak jakichkolwiek danych. / Parametr 'period' musi być liczbą. / Parametr 'period' musi być większy od zera. / Parametr 'price' musi być liczbą. / Parametr 'price' musi być większy od zera. / Nieprawidłowy ID wycieczki.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Wycieczka o podanym ID nie istnieje. / Kraj o podanym ID nie istnieje.
 *       409:
 *         description: Taka wycieczka już istnieje.
 *       500:
 *         description: Błąd serwera podczas aktualizowania wycieczki. / Błąd serwera podczas pobierania wycieczki. / Błąd serwera podczas pobierania kraju.
 */
router.put('/:id', verifyToken, isAdmin, controller.updateTrip);

/**
 * @swagger
 * /trips/{id}:
 *   delete:
 *     summary: Usuwanie wycieczki
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID wycieczki
 *     responses:
 *       200:
 *         description: Wycieczka usunięta.
 *       400:
 *         description: Nieprawidłowy ID wycieczki. / Nie można usunąć wycieczki, która posiada rezerwacje.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Wycieczka o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas usuwania wycieczki. / Błąd serwera podczas pobierania rezerwacji wycieczki.
 */
router.delete('/:id', verifyToken, isAdmin, controller.deleteTrip);

router.get('/report/pdf', verifyToken, isAdmin, controller.generateTripsPDF);

// Eksport routera
module.exports = router;