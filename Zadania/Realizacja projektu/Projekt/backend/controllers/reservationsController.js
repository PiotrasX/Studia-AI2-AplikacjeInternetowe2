// Import połączenia z bazą danych
const db = require('../db/database');

// Import bibliotek
const PDFDocument = require('pdfkit');
const { logAction } = require('../utils/logger');

// Wyszukiwanie z normalizacją polskich znaków diakrytycznych
function normalize(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[łŁ]/g, "l")
        .toLowerCase();
}

// Pobieranie wszystkich rezerwacji z obsługą filtrowania, sortowania, wyszukiwania i paginacji
exports.getAllReservations = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'reservations.id', order = 'asc', user_email, user_id, trip_name, trip_id, status, page = 1, limit = 5 } = req.query;
    
    // Normalizowanie zapytania
    const normalizedSearch = normalize(search);

    // Normalizowanie SQL
    const normalizeSQL = `
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(col,
        'ą','a'),'ć','c'),'ę','e'),'ł','l'),'ń','n'),'ó','o'),'ś','s'),'ź','z'),'ż','z'),
        'Ą','A'),'Ć','C'),'Ę','E'),'Ł','L'),'Ń','N'),'Ó','O'),'Ś','S'),'Ź','Z'),'Ż','Z')
    `;
    
    // Obliczenie przesunięcia dla paginacji
    const offset = (page - 1) * limit;

    // Dozwolone pola do sortowania i kolejności sortowania
    const allowedSortFields = {
        id: 'reservations.id',
        user_id: 'reservations.user_id',
        trip_id: 'reservations.trip_id',
        reservation_date: 'reservations.reservation_date',
        trip_date: 'reservations.trip_date',
        status: 'reservations.status',
        user_email: 'users.email',
        trip_name: 'trips.name'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'reservations.id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie wycieczki, adresie e-mail użytkownika, statusie wycieczki, dacie rezerwacji lub dacie wycieczki
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'trips.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'users.email')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'reservations.status')}) LIKE ?
            OR reservations.reservation_date LIKE ?
            OR reservations.trip_date LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${search}%`, `%${search}%`];

    // Filtrowanie po nazwie wycieczki
    if (trip_name) {
        whereClause += ' AND trips.name = ?';
        params.push(trip_name);
    }

    // Filtrowanie po ID wycieczki
    if (trip_id) {
        whereClause += ' AND trips.id = ?';
        params.push(trip_id);
    }

    // Filtrowanie po adresie e-mail użytkownika
    if (user_email) {
        whereClause += ' AND users.email = ?';
        params.push(user_email);
    }

    // Filtrowanie po ID użytkownika
    if (user_id) {
        whereClause += ' AND users.id = ?';
        params.push(user_id);
    }

    // Filtrowanie po statusie rezerwacji
    if (status) {
        whereClause += ' AND reservations.status = ?';
        params.push(status);
    }

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            reservations.id,
            users.id AS user_id,
            users.email AS user_email,
            trips.id AS trip_id,
            trips.name AS trip_name,
            reservations.reservation_date,
            reservations.trip_date,
            reservations.status
        FROM reservations
        JOIN users ON reservations.user_id = users.id
        JOIN trips ON reservations.trip_id = trips.id
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT ? OFFSET ?
    `;

    // Dodanie limitu i przesunięcia do parametrów
    params.push(Number(limit), Number(offset));

    // Wykonanie zapytania do pobrania wszystkich rezerwacji
    db.all(
        query,
        params,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });
            if (!rows || rows.length === 0) return res.status(200).json({ message: 'Nie znaleziono żadnych rezerwacji.', data: [] });
            res.status(200).json({ message: 'Pobrano rezerwacje.', data: rows });
        }
    );
};

// Pobieranie jednej rezerwacji
exports.getReservation = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID rezerwacji.' });

    // Zapytanie SQL
    const query = `
        SELECT 
            reservations.id,
            users.id AS user_id,
            users.email AS user_email,
            trips.id AS trip_id,
            trips.name AS trip_name,
            reservations.reservation_date,
            reservations.trip_date,
            reservations.status
        FROM reservations
        JOIN users ON reservations.user_id = users.id
        JOIN trips ON reservations.trip_id = trips.id
        WHERE reservations.id = ?
    `;

    // Wykonanie zapytania do pobrania jednej rezerwacji
    db.get(
        query,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });
            if (!row) return res.status(404).json({ error: 'Rezerwacja o podanym ID nie istnieje.' });
            res.status(200).json({ message: 'Pobrano jedną rezerwacje.', data: row });
        }
    );
};

// Dodawanie nowej rezerwacji
exports.addReservation = (req, res) => {
    // Pobranie parametrów przesłanych w ciele żądania
    const { user_id, trip_id, trip_date, status = 'oczekujacy' } = req.body;

    // Walidacja wymaganych danych
    if (user_id == null || trip_id == null || !trip_date) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    // Walidacja typów danych
    if (!['oczekujacy', 'zatwierdzony', 'anulowany', 'zakonczony'].includes(status)) return res.status(400).json({ error: 'Nieprawidłowy status rezerwacji.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trip_date)) return res.status(400).json({ error: 'Nieprawidłowy format daty wycieczki. Wymagany RRRR-MM-DD.' });

    // Walidacja poprawności daty wycieczki
    const [year, month, day] = trip_date.split('-').map(Number);
    const dateCheck = new Date(year, month - 1, day);
    if (dateCheck.getFullYear() !== year || dateCheck.getMonth() + 1 !== month || dateCheck.getDate() !== day) return res.status(400).json({ error: 'Nieprawidłowa data wycieczki. Taka data nie istnieje.' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDateObj = new Date(trip_date);
    tripDateObj.setHours(0, 0, 0, 0);
    if (tripDateObj.getTime() <= today.getTime()) return res.status(400).json({ error: 'Nieprawidłowa data wycieczki. Wymagana co najmniej dzień po dacie rezerwacji.' });

    // Wykonanie zapytania do pobrania jednego użytkownika
    db.get(
        'SELECT id FROM users WHERE id = ?', 
        [user_id], 
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
            if (!user) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });

            // Wykonanie zapytania do pobrania jednej wycieczki
            db.get(
                'SELECT id FROM trips WHERE id = ?', 
                [trip_id], 
                (err, trip) => {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
                    if (!trip) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });

                    // Wykonanie zapytania do pobrania rezerwacji w celu sprawdzenia duplikatu
                    db.get(
                        'SELECT id FROM reservations WHERE user_id = ? AND trip_id = ? AND trip_date = ?',
                        [user_id, trip_id, trip_date],
                        (err, existing) => {
                            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });
                            if (existing) return res.status(409).json({ error: 'Taka rezerwacja już istnieje.' });

                            // Wykonanie polecenia do dodania nowej rezerwacji
                            db.run(
                                'INSERT INTO reservations (user_id, trip_id, trip_date, status) VALUES (?, ?, ?, ?)',
                                [user_id, trip_id, trip_date, status],
                                function (err) {
                                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas dodawania rezerwacji.' });

                                    // Log - dodawanie rezerwacji
                                    logAction(
                                        req.user, 
                                        'ADD_RESERVATION', 
                                        `Dodano rezerwację z ID ${this.lastID}`
                                    );

                                    res.status(201).json({ message: 'Nowa rezerwacja dodana.', reservation: { id: this.lastID, user_id, trip_id, trip_date, status } });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// Aktualizacja rezerwacji
exports.updateReservation = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Pobranie parametrów przesłanych w ciele żądania
    const { user_id, trip_id, trip_date, status } = req.body;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID rezerwacji.' });

    // Walidacja wymaganych danych
    if (user_id === undefined && trip_id === undefined && !trip_date && !status) return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });

    // Walidacja typów danych
    if (status && !['oczekujacy', 'zatwierdzony', 'anulowany', 'zakonczony'].includes(status)) return res.status(400).json({ error: 'Nieprawidłowy status rezerwacji.' });
    if (trip_date && !/^\d{4}-\d{2}-\d{2}$/.test(trip_date)) return res.status(400).json({ error: 'Nieprawidłowy format daty wycieczki. Wymagany RRRR-MM-DD.' });
    
    // Walidacja poprawności daty wycieczki
    if (trip_date) {
        const [year, month, day] = trip_date.split('-').map(Number);
        const dateCheck = new Date(year, month - 1, day);
        if (dateCheck.getFullYear() !== year || dateCheck.getMonth() + 1 !== month || dateCheck.getDate() !== day) return res.status(400).json({ error: 'Nieprawidłowa data wycieczki. Taka data nie istnieje.' });
    }

    // Wykonanie zapytania do pobrania rezerwacji w celu sprawdzenia duplikatu
    db.get(
        'SELECT * FROM reservations WHERE id = ?', 
        [id], 
        (err, existingReservation) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });
            if (!existingReservation) return res.status(404).json({ error: 'Rezerwacja o podanym ID nie istnieje.' });

            const reservationDate = new Date(existingReservation.reservation_date);
            reservationDate.setHours(0, 0, 0, 0);
            const tripDateObj = new Date(trip_date);
            tripDateObj.setHours(0, 0, 0, 0);
            const nextDay = new Date(reservationDate);
            nextDay.setDate(nextDay.getDate() + 1);
            if (tripDateObj.getTime() < nextDay.getTime()) return res.status(400).json({ error: 'Nieprawidłowa data wycieczki. Wymagana co najmniej dzień po dacie rezerwacji.' })

            // Łączenie istniejących danych z nowymi
            const updatedReservation = {
                user_id: user_id !== undefined ? user_id : existingReservation.user_id,
                trip_id: trip_id !== undefined ? trip_id : existingReservation.trip_id,
                trip_date: trip_date ?? existingReservation.trip_date,
                status: status ?? existingReservation.status
            };

            // Jeśli podano user_id i podano trip_id
            if (user_id !== undefined && trip_id !== undefined) {
                // Wykonanie zapytania do pobrania jednego użytkownika
                db.get(
                    'SELECT id FROM users WHERE id = ?',
                    [user_id],
                    (err, user) => {
                        if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
                        if (!user) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });

                        // Wykonanie zapytania do pobrania jednej wycieczki
                        db.get(
                            'SELECT id FROM trips WHERE id = ?',
                            [trip_id],
                            (err, trip) => {
                                if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
                                if (!trip) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });
                                checkDuplicate(updatedReservation);
                            }
                        );
                    }
                );
            // Jeśli podano user_id i nie podano trip_id
            } else if (user_id !== undefined) {
                // Wykonanie zapytania do pobrania jednego użytkownika
                db.get(
                    'SELECT id FROM users WHERE id = ?',
                    [user_id],
                    (err, user) => {
                        if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
                        if (!user) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });
                        checkDuplicate(updatedReservation);
                    }
                );
            // Jeśli nie podano user_id i podano trip_id
            } else if (trip_id !== undefined) {
                // Wykonanie zapytania do pobrania jednej wycieczki
                db.get(
                    'SELECT id FROM trips WHERE id = ?',
                    [trip_id],
                    (err, trip) => {
                        if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
                        if (!trip) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });
                        checkDuplicate(updatedReservation);
                    }
                );
            // Nie podano user_id i nie podano trip_id
            } else {
                checkDuplicate(updatedReservation);
            }
        }
    );

    // Funkcja wykonująca zapytanie do pobrania jednej rezerwacji w celu sprawdzenia duplikatu
    function checkDuplicate(reservation) {
        // Zapytanie SQL
        const query = `
            SELECT id FROM reservations
            WHERE user_id = ? AND trip_id = ? AND trip_date = ?
            AND id != ?
        `;
        const params = [reservation.user_id, reservation.trip_id, reservation.trip_date, id];

        // Wykonanie zapytania do pobrania jednej rezerwacji w celu sprawdzenia duplikatu
        db.get(
            query,
            params,
            (err, row) => {
                if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });
                if (row) return res.status(409).json({ error: 'Taka rezerwacja już istnieje.' });
                runUpdate(reservation);
            }
        );
    }

    // Funkcja wykonująca polecenie do aktualizacji rezerwacji
    function runUpdate(reservation) {
        // Zapytanie SQL
        const query = `
            UPDATE reservations
            SET user_id = ?, trip_id = ?, trip_date = ?, status = ?
            WHERE id = ?
        `;
        const params = [reservation.user_id, reservation.trip_id, reservation.trip_date, reservation.status, id];

        // Wykonanie polecenia do aktualizacji rezerwacji
        db.run(
            query,
            params,
            function (err) {
                if (err) return res.status(500).json({ error: 'Błąd serwera podczas aktualizowania rezerwacji.' });
                if (this.changes === 0) return res.status(404).json({ error: 'Rezerwacja o podanym ID nie istnieje.' });

                // Log - aktualizacja rezerwacji
                logAction(
                    req.user, 
                    'UPDATE_RESERVATION', 
                    `Zaktualizowano rezerwację z ID ${id}`
                );

                res.status(200).json({ message: 'Rezerwacja zaktualizowana.', reservation: { id, ...reservation } });
            }
        );
    }
};

// Usuwanie rezerwacji
exports.deleteReservation = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID rezerwacji.' });

    // Wykonanie polecenia do usunięcia wycieczki
    db.run(
        'DELETE FROM reservations WHERE id = ?',
        [id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas usuwania rezerwacji.' });
            if (this.changes === 0) return res.status(404).json({ error: 'Rezerwacja o podanym ID nie istnieje.' });

            // Log - usuwanie rezerwacji
            logAction(
                req.user, 
                'DELETE_RESERVATION', 
                `Usunięto rezerwację z ID ${id}`
            );

            res.status(200).json({ message: 'Rezerwacja usunięta.', deletedId: id });
        }
    );
};

// Pobieranie liczby rezerwacji wycieczki
exports.getReservationsCountByTrip = (req, res) => {
    // Pobranie parametru z URL
	const { trip_id } = req.params;

    // Walidacja ID
    if (!trip_id  || isNaN(Number(trip_id))) return res.status(400).json({ error: 'Nieprawidłowy ID wycieczki.' });

    // Wykonanie zapytania do pobrania jednej wycieczki
    db.get(
        'SELECT id FROM trips WHERE id = ?', 
        [trip_id], 
        (err, trip) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
            if (!trip) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });
            
            // Wykonanie zapytania do pobrania liczby rezerwacji wycieczki
            db.get(
                'SELECT COUNT(*) AS count FROM reservations WHERE trip_id = ?',
                [trip_id],
                (err, row) => {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania liczby rezerwacji wycieczki.' });
                    res.status(200).json({ message: 'Pobrano liczbę rezerwacji wycieczki.', count: row.count });
                }
            );
        }
    );
};

// Pobieranie liczby rezerwacji użytkownika
exports.getReservationsCountByUser = (req, res) => {
    // Pobranie parametru z URL
    const { user_id } = req.params;

    // Walidacja ID
    if (!user_id  || isNaN(Number(user_id))) return res.status(400).json({ error: 'Nieprawidłowy ID użytkownika.' });

    // Wykonanie zapytania do pobrania jednego użytkownika
    db.get(
        'SELECT id FROM users WHERE id = ?', 
        [user_id], 
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
            if (!user) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });
            
            // Wykonanie zapytania do pobrania liczby rezerwacji wycieczki
            db.get(
                'SELECT COUNT(*) AS count FROM reservations WHERE user_id = ?',
                [user_id],
                (err, row) => {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania liczby rezerwacji użytkownika.' });
                    res.status(200).json({ message: 'Pobrano liczbę rezerwacji użytkownika.', count: row.count });
                }
            );
        }
    );
};

// Pobieranie wszystkich rezerwacji użytkownika
exports.getReservationsByUser = (req, res) => {
    // Pobranie parametru z URL
    const { user_id } = req.params;

    // Walidacja ID
    if (!user_id  || isNaN(Number(user_id))) return res.status(400).json({ error: 'Nieprawidłowy ID użytkownika.' });

    // Wykonanie zapytania do pobrania jednego użytkownika
    db.get(
        'SELECT id FROM users WHERE id = ?', 
        [user_id], 
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
            if (!user) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });
            
            // Zapytanie SQL
            const query = `
                SELECT 
                    reservations.id,
                    trips.id AS trip_id,
                    trips.name AS trip_name,
                    reservations.reservation_date,
                    reservations.trip_date,
                    reservations.status
                FROM reservations
                JOIN trips ON reservations.trip_id = trips.id
                WHERE reservations.user_id = ?
                ORDER BY reservations.trip_date ASC
            `;

            // Wykonanie zapytania do pobrania wszystkich rezerwacji użytkownika
            db.all(
                query, 
                [user_id], 
                (err, rows) => {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji użytkownika.' });
                    if (!rows || rows.length === 0) return res.status(200).json({ message: 'Nie znaleziono żadnych rezerwacji użytkownika.', data: [] });
                    res.status(200).json({ message: 'Pobrano rezerwacje użytkownika.', data: rows });
                }
            );
        }
    );
};

// Rezerwacja wycieczki przez zalogowanego użytkownika
exports.bookTrip = (req, res) => {
    // Pobranie parametru z tokenu uwierzytelniającego JWT
    const user_id = req.user.id;

    // Pobranie parametrów przesłanych w ciele żądania
    const { trip_id, trip_date, status = 'oczekujacy' } = req.body;

    // Walidacja ID
    if (!user_id  || isNaN(Number(user_id))) return res.status(400).json({ error: 'Nieprawidłowy ID użytkownika.' });

    // Walidacja wymaganych danych
    if (trip_id == null || !trip_date) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    // Walidacja typów danych
    if (!['oczekujacy', 'zatwierdzony', 'anulowany', 'zakonczony'].includes(status)) return res.status(400).json({ error: 'Nieprawidłowy status rezerwacji.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trip_date)) return res.status(400).json({ error: 'Nieprawidłowy format daty wycieczki. Wymagany RRRR-MM-DD.' });

    // Walidacja poprawności daty wycieczki
    const [year, month, day] = trip_date.split('-').map(Number);
    const dateCheck = new Date(year, month - 1, day);
    if (dateCheck.getFullYear() !== year || dateCheck.getMonth() + 1 !== month || dateCheck.getDate() !== day) return res.status(400).json({ error: 'Nieprawidłowa data wycieczki. Taka data nie istnieje.' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDateObj = new Date(trip_date);
    tripDateObj.setHours(0, 0, 0, 0);
    if (tripDateObj.getTime() <= today.getTime()) return res.status(400).json({ error: 'Nieprawidłowa data wycieczki. Wymagana co najmniej dzień po dacie rezerwacji.' });

    // Wykonanie zapytania do pobrania jednej wycieczki
    db.get(
        'SELECT id FROM trips WHERE id = ?', 
        [trip_id], 
        (err, trip) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
            if (!trip) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });

            // Wykonanie zapytania do pobrania rezerwacji w celu sprawdzenia duplikatu
            db.get(
                'SELECT id FROM reservations WHERE user_id = ? AND trip_id = ? AND trip_date = ?',
                [user_id, trip_id, trip_date],
                (err, existing) => {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });
                    if (existing) return res.status(409).json({ error: 'Taka rezerwacja już istnieje.' });

                    // Wykonanie polecenia do dodania nowej rezerwacji
                    db.run(
                        'INSERT INTO reservations (user_id, trip_id, trip_date, status) VALUES (?, ?, ?, ?)',
                        [user_id, trip_id, trip_date, status],
                        function (err) {
                            if (err) return res.status(500).json({ error: 'Błąd serwera podczas dodawania rezerwacji.' });

                            // Log - rezerwacja wycieczki
                            logAction(
                                req.user, 
                                'BOOK_TRIP',
                                `Użytkownik z ID ${user_id} zarezerwował wycieczkę z ID ${trip_id}`
                            );

                            res.status(201).json({ message: 'Nowa rezerwacja utworzona.', reservation: { id: this.lastID, user_id, trip_id, trip_date, status } });
                        }
                    );
                }
            );
        }
    );
};

// Generowanie raportu PDF wszystkich rezerwacji z obsługą filtrowania, sortowania i wyszukiwania
exports.generateReservationsPDF = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'reservations.id', order = 'asc', user_email, user_id, trip_name, trip_id, status } = req.query;
    
    // Normalizowanie zapytania
    const normalizedSearch = normalize(search);

    // Normalizowanie SQL
    const normalizeSQL = `
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(col,
        'ą','a'),'ć','c'),'ę','e'),'ł','l'),'ń','n'),'ó','o'),'ś','s'),'ź','z'),'ż','z'),
        'Ą','A'),'Ć','C'),'Ę','E'),'Ł','L'),'Ń','N'),'Ó','O'),'Ś','S'),'Ź','Z'),'Ż','Z')
    `;

    // Dozwolone pola do sortowania i kolejności sortowania
    const allowedSortFields = {
        id: 'reservations.id',
        user_id: 'reservations.user_id',
        trip_id: 'reservations.trip_id',
        reservation_date: 'reservations.reservation_date',
        trip_date: 'reservations.trip_date',
        status: 'reservations.status',
        user_email: 'users.email',
        trip_name: 'trips.name'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'reservations.id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie wycieczki, adresie e-mail użytkownika, statusie wycieczki, dacie rezerwacji lub dacie wycieczki
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'trips.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'users.email')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'reservations.status')}) LIKE ?
            OR reservations.reservation_date LIKE ?
            OR reservations.trip_date LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${search}%`, `%${search}%`];

    // Filtrowanie po nazwie wycieczki
    if (trip_name) {
        whereClause += ' AND trips.name = ?';
        params.push(trip_name);
    }

    // Filtrowanie po ID wycieczki
    if (trip_id) {
        whereClause += ' AND trips.id = ?';
        params.push(trip_id);
    }

    // Filtrowanie po adresie e-mail użytkownika
    if (user_email) {
        whereClause += ' AND users.email = ?';
        params.push(user_email);
    }

    // Filtrowanie po ID użytkownika
    if (user_id) {
        whereClause += ' AND users.id = ?';
        params.push(user_id);
    }

    // Filtrowanie po statusie rezerwacji
    if (status) {
        whereClause += ' AND reservations.status = ?';
        params.push(status);
    }

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            reservations.id,
            users.id AS user_id,
            users.email AS user_email,
            trips.id AS trip_id,
            trips.name AS trip_name,
            reservations.reservation_date,
            reservations.trip_date,
            reservations.status
        FROM reservations
        JOIN users ON reservations.user_id = users.id
        JOIN trips ON reservations.trip_id = trips.id
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
    `;

    // Wykonanie zapytania do pobrania wszystkich rezerwacji
    db.all(
        query, 
        params, 
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=\"reservations_report.pdf\"");

            const pdf = new PDFDocument({
                margin: 32,
                bufferPages: true
            })
            pdf.registerFont('dejavu', 'fonts/DejaVuSans.ttf');
            pdf.font('dejavu');
            pdf.pipe(res);

            // Nagłówek PDF
            pdf.fontSize(20).text("Raport rezerwacji", { align: 'center' });
            pdf.moveDown(1);

            let startY = pdf.y;

            const margin = 32;
            const spacing = 6;

            const colIDWidth = 25;
            const colEmailWidth = 118;
            const colTripWidth = 110;
            const colResDateWidth = 73;
            const colTripDateWidth = 63;
            const colStatusWidth = 75;

            const colIDStart = margin + spacing;
            const colEmailStart = colIDStart + colIDWidth + spacing + spacing;
            const colTripStart = colEmailStart + colEmailWidth + spacing + spacing;
            const colResDateStart = colTripStart + colTripWidth + spacing + spacing;
            const colTripDateStart = colResDateStart + colResDateWidth + spacing + spacing;
            const colStatusStart = colTripDateStart + colTripDateWidth + spacing + spacing;
            const colEnd = colStatusStart + colStatusWidth + spacing;

            // Nagłówki tabeli
            pdf.fontSize(13);
            pdf.text("ID", colIDStart, startY);
            pdf.text("E-mail", colEmailStart, startY);
            pdf.text("Wycieczka", colTripStart, startY);
            pdf.text("Rezerwacja", colResDateStart, startY);
            pdf.text("Wyjazd", colTripDateStart, startY);
            pdf.text("Status", colStatusStart, startY);
            pdf.moveDown(0.5);

            // Linie poziome
            pdf.moveTo(31.5, startY - 6).lineTo(568.5, startY - 6).stroke();
            pdf.moveTo(31.5, startY - 5.5).lineTo(568.5, startY - 5.5).stroke();
            pdf.moveTo(31.5, pdf.y - 0.38).lineTo(568.5, pdf.y - 0.38).stroke();
            pdf.moveTo(31.5, pdf.y + 0.12).lineTo(568.5, pdf.y + 0.12).stroke();

            // Linie pionowe
            pdf.moveTo(colIDStart - spacing, startY - 5.2).lineTo(colIDStart - spacing, pdf.y).stroke();
            pdf.moveTo(colEmailStart - spacing, startY - 5.2).lineTo(colEmailStart - spacing, pdf.y).stroke();
            pdf.moveTo(colTripStart - spacing, startY - 5.2).lineTo(colTripStart - spacing, pdf.y).stroke();
            pdf.moveTo(colResDateStart - spacing, startY - 5.2).lineTo(colResDateStart - spacing, pdf.y).stroke();
            pdf.moveTo(colTripDateStart - spacing, startY - 5.2).lineTo(colTripDateStart - spacing, pdf.y).stroke();
            pdf.moveTo(colStatusStart - spacing, startY - 5.2).lineTo(colStatusStart - spacing, pdf.y).stroke();
            pdf.moveTo(colEnd, startY - 5.2).lineTo(colEnd, pdf.y).stroke();

            let first = true;
            const oneLine = pdf.heightOfString("X", { width: colIDWidth });

            rows.forEach(row => {
                // Formatowanie daty z RRRR-MM-DD na DD.MM.RRRR
                function formatDate(dateStr) {
                    if (!dateStr) return "-";
                    const [year, month, day] = dateStr.split("-");
                    return `${day}.${month}.${year}`;
                }

                // Formatowanie statusu
                function formatStatus(status, pdf) {
                    if (!status) {
                        pdf.fillColor("#000000");
                        return "-";
                    }

                    switch (status) {
                        case "oczekujacy":
                            pdf.fillColor("#a87500");
                            return "Oczekujący";
                        case "zatwierdzony":
                            pdf.fillColor("#139513");
                            return "Zatwierdzony";
                        case "zakonczony":
                            pdf.fillColor("#555454");
                            return "Zakończony";
                        case "anulowany":
                            pdf.fillColor("#961111");
                            return "Anulowany";
                        default:
                            pdf.fillColor("#000000");
                            return String(status);
                    }
                }

                const safeEmail = row.user_email ? String(row.user_email) : "-";
                const safeTrip = row.trip_name ? String(row.trip_name) : "-";
                const safeResDate = formatDate(row.reservation_date);
                const safeTripDate = formatDate(row.trip_date);
                const statusText = row.status ? String(row.status) : "-";

                pdf.moveDown(0.3);

                let rowY = pdf.y;
                let rowStartY = pdf.y;

                const hID = pdf.heightOfString(String(row.id), { width: colIDWidth })
                const hEmail = pdf.heightOfString(safeEmail, { width: colEmailWidth })
                const hTrip = pdf.heightOfString(safeTrip, { width: colTripWidth })
                const hResDate = pdf.heightOfString(safeResDate, { width: colResDateWidth })
                const hTripDate = pdf.heightOfString(safeTripDate, { width: colTripDateWidth })
                const hStatus = pdf.heightOfString(statusText, { width: colStatusWidth })

                const rowHeight = Math.max(hID, hEmail, hTrip, hResDate, hTripDate, hStatus)

                if (first) {
                    pdf.moveUp(0.05);
                    rowY = pdf.y;
                }

                // Nowa strona gdy brakuje miejsca
                if (rowY + rowHeight > pdf.page.height - 64) {
                    pdf.addPage()
                    
                    rowY = pdf.y

                    pdf.strokeColor('#cccccc');
                    pdf.moveTo(31.5, pdf.y - 3.35).lineTo(568.5, pdf.y - 3.35).stroke();
                    pdf.strokeColor('#000000');
                }

                // Rekord tabeli
                pdf.fontSize(11);
                pdf.text(String(row.id), colIDStart, rowY, { width: colIDWidth });
                pdf.text(safeEmail, colEmailStart, rowY, { width: colEmailWidth });
                pdf.text(safeTrip, colTripStart, rowY, { width: colTripWidth });
                pdf.text(safeResDate, colResDateStart, rowY, { width: colResDateWidth });
                pdf.text(safeTripDate, colTripDateStart, rowY, { width: colTripDateWidth });
                const safeStatus = formatStatus(statusText, pdf);
                pdf.text(safeStatus, colStatusStart, rowY, { width: colStatusWidth });
                pdf.y = rowY + rowHeight
                pdf.fillColor("#000000");

                if (first) {
                    if (rowHeight <= oneLine) pdf.moveDown(0.12);
                    else pdf.moveUp(0.05);
                } else pdf.moveDown(0.3);

                // Linia pozioma
                pdf.strokeColor('#cccccc');
                pdf.moveTo(31.5, pdf.y).lineTo(568.5, pdf.y).stroke();

                if (first) {
                    rowY = rowStartY;
                    first = false;
                }

                // Linie pionowe
                pdf.moveTo(colIDStart - spacing, rowY - 3.85).lineTo(colIDStart - spacing, pdf.y).stroke();
                pdf.moveTo(colEmailStart - spacing, rowY - 3.85).lineTo(colEmailStart - spacing, pdf.y).stroke();
                pdf.moveTo(colTripStart - spacing, rowY - 3.85).lineTo(colTripStart - spacing, pdf.y).stroke();
                pdf.moveTo(colResDateStart - spacing, rowY - 3.85).lineTo(colResDateStart - spacing, pdf.y).stroke();
                pdf.moveTo(colTripDateStart - spacing, rowY - 3.85).lineTo(colTripDateStart - spacing, pdf.y).stroke();
                pdf.moveTo(colStatusStart - spacing, rowY - 3.85).lineTo(colStatusStart - spacing, pdf.y).stroke();
                pdf.moveTo(colEnd, rowY - 3.85).lineTo(colEnd, pdf.y).stroke();
                pdf.strokeColor('#000000');
            });

            const pages = pdf.bufferedPageRange();
            const pageCount = pages.count;

            for (let i = pages.start; i < pages.start + pageCount; i++) {
                pdf.switchToPage(i);

                const text = `Strona ${i - pages.start + 1} z ${pageCount}`;

                const x = pdf.page.width / 2 - 24;
                const y = pdf.page.height - 32;

                pdf.addContent(`
                    q
                    1 0 0 -1 0 ${pdf.page.height} cm
                    BT
                    /F1 9 Tf
                    ${x} ${pdf.page.height - y} Td
                    (${text}) Tj
                    ET
                    Q
                `);
            }

            pdf.end();

            // Log - generowanie raportu
            logAction(
                req.user, 
                'GENERATE_REPORT_RESERVATIONS', 
                'Wygenerowano raport PDF: reservations'
            );
        }
    );
};