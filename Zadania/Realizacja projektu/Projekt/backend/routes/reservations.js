// Import bibliotek
const express = require('express');
const router = express.Router();

// Import middlewarów
const { verifyToken, isAdmin, isAdminOrSelf } = require('../middleware/authMiddleware');

// Import kontrolera z logiką obsługi endpointów
const controller = require('../controllers/reservationsController');

// Definicja endpointów i powiązanie ich z funkcjami kontrolera

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Operacje na rezerwacjach
 */

/**
 * @swagger
 * /reservations/count/trip/{trip_id}:
 *   get:
 *     summary: Pobieranie liczby rezerwacji wycieczki
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: trip_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID wycieczki
 *     responses:
 *       200:
 *         description: Pobrano liczbę rezerwacji wycieczki.
 *       400:
 *         description: Nieprawidłowy ID wycieczki.
 *       404:
 *         description: Wycieczka o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania liczby rezerwacji wycieczki. / Błąd serwera podczas pobierania wycieczki.
 */
router.get('/count/trip/:trip_id', controller.getReservationsCountByTrip);

/**
 * @swagger
 * /reservations/count/user/{user_id}:
 *   get:
 *     summary: Pobieranie liczby rezerwacji użytkownika
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID użytkownika
 *     responses:
 *       200:
 *         description: Pobrano liczbę rezerwacji użytkownika.
 *       400:
 *         description: Nieprawidłowy ID użytkownika.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Użytkownik o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania liczby rezerwacji użytkownika. / Błąd serwera podczas pobierania użytkownika.
 */
router.get('/count/user/:user_id', verifyToken, isAdmin, controller.getReservationsCountByUser);

/**
 * @swagger
 * /reservations/user/{user_id}:
 *   get:
 *     summary: Pobieranie wszystkich rezerwacji użytkownika
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID użytkownika
 *     responses:
 *       200:
 *         description: Pobrano rezerwacje użytkownika. / Nie znaleziono żadnych rezerwacji użytkownika.
 *       400:
 *         description: Nieprawidłowy ID użytkownika.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień do tych danych.
 *       404:
 *         description: Użytkownik o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania rezerwacji użytkownika. / Błąd serwera podczas pobierania użytkownika.
 */
router.get('/user/:user_id', verifyToken, isAdminOrSelf, controller.getReservationsByUser);

/**
 * @swagger
 * /reservations/book:
 *   post:
 *     summary: Rezerwacja wycieczki przez zalogowanego użytkownika
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trip_id
 *               - trip_date
 *             properties:
 *               trip_id:
 *                 type: integer
 *                 description: not null
 *               trip_date:
 *                 type: string
 *                 format: date
 *                 description: not null
 *               status:
 *                 type: string
 *                 enum: [oczekujacy, zatwierdzony, anulowany, zakonczony]
 *                 default: oczekujacy
 *     responses:
 *       201:
 *         description: Nowa rezerwacja utworzona.
 *       400:
 *         description: Brak wymaganych danych. / Nieprawidłowy status rezerwacji. / Nieprawidłowy format daty wycieczki. Wymagany RRRR-MM-DD. / Nieprawidłowa data wycieczki. Taka data nie istnieje. / Nieprawidłowa data wycieczki. Wymagana co najmniej dzień po dacie rezerwacji. / Nieprawidłowy ID użytkownika.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny.
 *       404:
 *         description: Wycieczka o podanym ID nie istnieje.
 *       409:
 *         description: Taka rezerwacja już istnieje.
 *       500:
 *         description: Błąd serwera podczas dodawania rezerwacji. / Błąd serwera podczas pobierania rezerwacji. / Błąd serwera podczas pobierania wycieczki.
 */
router.post('/book', verifyToken, controller.bookTrip);

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Pobieranie wszystkich rezerwacji z obsługą filtrowania, sortowania, wyszukiwania i paginacji
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Wyszukiwanie po nazwie wycieczki, adresie e-mail użytkownika, statusie wycieczki, dacie rezerwacji lub dacie wycieczki
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: id
 *         description: Sortowanie po kolumnie (id, user_id, user_email, trip_id, trip_name, reservation_date, trip_date, status)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Kolejność sortowania
 *       - in: query
 *         name: trip_name
 *         schema:
 *           type: string
 *         description: Filtrowanie po nazwie wycieczki
 *       - in: query
 *         name: trip_id
 *         schema:
 *           type: integer
 *         description: Filtrowanie po ID wycieczki
 *       - in: query
 *         name: user_email
 *         schema:
 *           type: string
 *         description: Filtrowanie po adresie e-mail użytkownika
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filtrowanie po ID użytkownika
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrowanie po statusie rezerwacji
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
 *         description: Pobrano rezerwacje. / Nie znaleziono żadnych rezerwacji.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       500:
 *         description: Błąd serwera podczas pobierania rezerwacji.
 */
router.get('/', verifyToken, isAdmin, controller.getAllReservations);

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Pobieranie jednej rezerwacji
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID rezerwacji
 *     responses:
 *       200:
 *         description: Pobrano jedną rezerwacje.
 *       400:
 *         description: Nieprawidłowy ID rezerwacji.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Rezerwacja o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas pobierania rezerwacji.
 */
router.get('/:id', verifyToken, isAdmin, controller.getReservation);

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Dodawanie nowej rezerwacji
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - trip_id
 *               - trip_date
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: not null
 *               trip_id:
 *                 type: integer
 *                 description: not null
 *               trip_date:
 *                 type: string
 *                 format: date
 *                 description: not null
 *               status:
 *                 type: string
 *                 enum: [oczekujacy, zatwierdzony, anulowany, zakonczony]
 *                 default: oczekujacy
 *     responses:
 *       201:
 *         description: Nowa rezerwacja dodana.
 *       400:
 *         description: Brak wymaganych danych. / Nieprawidłowy status rezerwacji. / Nieprawidłowy format daty wycieczki. Wymagany RRRR-MM-DD. / Nieprawidłowa data wycieczki. Taka data nie istnieje. / Nieprawidłowa data wycieczki. Wymagana co najmniej dzień po dacie rezerwacji.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Wycieczka o podanym ID nie istnieje. / Użytkownik o podanym ID nie istnieje.
 *       409:
 *         description: Taka rezerwacja już istnieje.
 *       500:
 *         description: Błąd serwera podczas dodawania rezerwacji. / Błąd serwera podczas pobierania rezerwacji. / Błąd serwera podczas pobierania wycieczki. / Błąd serwera podczas pobierania użytkownika.
 */
router.post('/', verifyToken, isAdmin, controller.addReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   put:
 *     summary: Aktualizacja rezerwacji
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID rezerwacji
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *               trip_id:
 *                 type: integer
 *               trip_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [oczekujacy, zatwierdzony, anulowany, zakonczony]
 *                 default: oczekujacy
 *     responses:
 *       200:
 *         description: Rezerwacja zaktualizowana.
 *       400:
 *         description: Brak jakichkolwiek danych. / Nieprawidłowy status rezerwacji. / Nieprawidłowy format daty wycieczki. Wymagany RRRR-MM-DD. / Nieprawidłowa data wycieczki. Taka data nie istnieje. / Nieprawidłowa data wycieczki. Wymagana co najmniej dzień po dacie rezerwacji. / Nieprawidłowy ID rezerwacji.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Rezerwacja o podanym ID nie istnieje. / Wycieczka o podanym ID nie istnieje. / Użytkownik o podanym ID nie istnieje.
 *       409:
 *         description: Taka rezerwacja już istnieje.
 *       500:
 *         description: Błąd serwera podczas aktualizowania rezerwacji. / Błąd serwera podczas pobierania rezerwacji. / Błąd serwera podczas pobierania wycieczki. / Błąd serwera podczas pobierania użytkownika.
 */
router.put('/:id', verifyToken, isAdmin, controller.updateReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Usuwanie rezerwacji
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID rezerwacji
 *     responses:
 *       200:
 *         description: Rezerwacja usunięta.
 *       400:
 *         description: Nieprawidłowy ID rezerwacji.
 *       401:
 *         description: Brak tokenu autoryzacyjnego.
 *       403:
 *         description: Nieprawidłowy lub wygasły token autoryzacyjny. / Nie posiadasz uprawnień administratora.
 *       404:
 *         description: Rezerwacja o podanym ID nie istnieje.
 *       500:
 *         description: Błąd serwera podczas usuwania rezerwacji.
 */
router.delete('/:id', verifyToken, isAdmin, controller.deleteReservation);

router.get('/report/pdf', verifyToken, isAdmin, controller.generateReservationsPDF);

// Eksport routera
module.exports = router;