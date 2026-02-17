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

// Pobieranie wszystkich wycieczek z obsługą filtrowania, sortowania, wyszukiwania i paginacji
exports.getAllTrips = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'trips.id', order = 'asc', continent_name, continent_id, country_name, country_id, page = 1, limit = 5 } = req.query;

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
        id: 'trips.id',
        name: 'trips.name',
        description: 'trips.description',
        period: 'trips.period',
        price: 'trips.price',
        country_name: 'countries.name',
        country_id: 'countries.id',
        continent_name: 'continents.name',
        continent_id: 'continents.id'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'trips.id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie kontynentu, nazwie kraju lub nazwie wycieczki
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'continents.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'countries.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'trips.name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`];

    // Filtrowanie po nazwie kontynentu
    if (continent_name) {
        whereClause += ' AND continents.name = ?';
        params.push(continent_name);
    }

    // Filtrowanie po ID kontynentu
    if (continent_id) {
        whereClause += ' AND continents.id = ?';
        params.push(continent_id);
    }

    // Filtrowanie po nazwie kraju
    if (country_name) {
        whereClause += ' AND countries.name = ?';
        params.push(country_name);
    }

    // Filtrowanie po ID kraju
    if (country_id) {
        whereClause += ' AND countries.id = ?';
        params.push(country_id);
    }

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            trips.id,
            trips.name,
            trips.description,
            trips.period,
            trips.price,
            countries.id AS country_id,
            countries.name AS country_name,
            continents.id AS continent_id,
            continents.name AS continent_name
        FROM trips
        JOIN countries ON trips.country_id = countries.id
        JOIN continents ON countries.continent_id = continents.id
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT ? OFFSET ?
    `;

    // Dodanie limitu i przesunięcia do parametrów
    params.push(Number(limit), Number(offset));

    // Wykonanie zapytania do pobrania wszystkich wycieczek
    db.all(
        query,
        params,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczek.' });
            if (!rows || rows.length === 0) return res.status(200).json({ message: 'Nie znaleziono żadnych wycieczek.', data: [] });
            res.status(200).json({ message: 'Pobrano wycieczki.', data: rows });
        }
    );
};

// Pobieranie jednej wycieczki
exports.getTrip = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID wycieczki.' });

    // Zapytanie SQL
    const query = `
        SELECT 
            trips.id,
            trips.name,
            trips.description,
            trips.period,
            trips.price,
            countries.id AS country_id,
            countries.name AS country_name,
            continents.id AS continent_id,
            continents.name AS continent_name
        FROM trips
        JOIN countries ON trips.country_id = countries.id
        JOIN continents ON countries.continent_id = continents.id
        WHERE trips.id = ?
    `;

    // Wykonanie zapytania do pobrania jednej wycieczki
    db.get(
        query,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
            if (!row) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });
            res.status(200).json({ message: 'Pobrano jedną wycieczkę.', data: row });
        }
    );
};

// Dodawanie nowej wycieczki
exports.addTrip = (req, res) => {
    // Pobranie parametrów przesłanych w ciele żądania
    const { name, description, period, price, country_id } = req.body;

    // Walidacja wymaganych danych
    if (!name || !description || period == null || price == null || country_id == null) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    // Walidacja typów danych
    const numericPeriod = Number(period);
    if (isNaN(numericPeriod)) return res.status(400).json({ error: `Parametr 'period' musi być liczbą.` });
    if (numericPeriod <= 0) return res.status(400).json({ error: `Parametr 'period' musi być większy od zera.` });
    const roundedPeriod = Math.ceil(numericPeriod);

    const numericPrice = Number(price);
    if (isNaN(numericPrice)) return res.status(400).json({ error: `Parametr 'price' musi być liczbą.` });
    if (numericPrice <= 0) return res.status(400).json({ error: `Parametr 'price' musi być większy od zera.` });
    const roundedPrice = parseFloat(numericPrice.toFixed(2));

    // Wykonanie zapytania do pobrania jednego kraju
    db.get(
        'SELECT id FROM countries WHERE id = ?',
        [country_id],
        (err, country) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kraju.' });
            if (!country) return res.status(404).json({ error: 'Kraj o podanym ID nie istnieje.' });

            // Wykonanie zapytania do pobrania wycieczki w celu sprawdzenia duplikatu
            db.get(
                'SELECT id FROM trips WHERE name = ? AND description = ? AND period = ? AND price = ? AND country_id = ?',
                [name, description, roundedPeriod, roundedPrice, country_id],
                (err, row) => {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
                    if (row) return res.status(409).json({ error: 'Taka wycieczka już istnieje.' });

                    // Wykonanie polecenia do dodania nowej wycieczki
                    db.run(
                        'INSERT INTO trips (name, description, period, price, country_id) VALUES (?, ?, ?, ?, ?)',
                        [name, description, roundedPeriod, roundedPrice, country_id],
                        function (err) {
                            if (err) return res.status(500).json({ error: 'Błąd serwera podczas dodawania wycieczki.' });

                            // Log - dodawanie wycieczki
                            logAction(
                                req.user,
                                'ADD_TRIP',
                                `Dodano wycieczkę z ID ${this.lastID}`
                            );

                            res.status(201).json({ message: 'Nowa wycieczka dodana.', trip: { id: this.lastID, name, description, period: roundedPeriod, price: roundedPrice, country_id } });
                        }
                    );
                }
            );
        }
    );
};

// Aktualizacja wycieczki
exports.updateTrip = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Pobranie parametrów przesłanych w ciele żądania
    const { name, description, period, price, country_id } = req.body;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID wycieczki.' });

    // Walidacja jakichkolwiek danych
    if (!name && !description && period === undefined && price === undefined && country_id === undefined) return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });

    // Walidacja typów danych
    if (period !== undefined && period !== "") {
        const numericPeriod = Number(period);
        if (isNaN(numericPeriod)) return res.status(400).json({ error: `Parametr 'period' musi być liczbą.` });
        if (numericPeriod <= 0) return res.status(400).json({ error: `Parametr 'period' musi być większy od zera.` });
    }
    if (price !== undefined && price !== "") {
        const numericPrice = Number(price);
        if (isNaN(numericPrice)) return res.status(400).json({ error: `Parametr 'price' musi być liczbą.` });
        if (numericPrice <= 0) return res.status(400).json({ error: `Parametr 'price' musi być większy od zera.` });
    }

    // Wykonanie zapytania do pobrania wycieczki w celu sprawdzenia duplikatu
    db.get(
        'SELECT * FROM trips WHERE id = ?', 
        [id], 
        (err, existingTrip) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
            if (!existingTrip) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });

            // Dynamiczne budowanie zapytania
            let fields = [];
            let params = [];

            if (name) { fields.push('name = ?'); params.push(name); }
            if (description) { fields.push('description = ?'); params.push(description); }
            if (period !== undefined && period !== "") {
                const numericPeriod = Number(period);
                const roundedPeriod = Math.ceil(numericPeriod);
                fields.push('period = ?'); 
                params.push(roundedPeriod); 
            }
            if (price !== undefined && price !== "") {
                const numericPrice = Number(price);
                const roundedPrice = parseFloat(numericPrice.toFixed(2));
                fields.push('price = ?'); 
                params.push(roundedPrice); 
            }
            if (country_id !== undefined) { fields.push('country_id = ?'); params.push(country_id); }

            // Czy nie ma żadnych pól do aktualizacji
            if (fields.length === 0) {
                return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });
            }

            // Łączenie istniejących danych z nowymi
            const updatedTrip = {
                name: name ?? existingTrip.name,
                description: description ?? existingTrip.description,
                period: (period !== undefined && period !== "") ? Math.ceil(Number(period)) : existingTrip.period,
                price: (price !== undefined && price !== "") ? parseFloat(Number(price).toFixed(2)) : existingTrip.price,
                country_id: country_id ?? existingTrip.country_id
            };

            // Dodanie ID do końca listy parametrów
            params.push(id);

            // Jeśli podano country_id
            if (country_id !== undefined) {
                // Wykonanie zapytania do pobrania jednego kraju
                db.get(
                    'SELECT id FROM countries WHERE id = ?',
                    [country_id],
                    (err, country) => {
                        if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kraju.' });
                        if (!country) return res.status(404).json({ error: 'Kraj o podanym ID nie istnieje.' });
                        checkDuplicate(updatedTrip, fields, params);
                    }
                );
            // Nie podano country_id
            } else {
                checkDuplicate(updatedTrip, fields, params);
            }
        }
    );

    // Funkcja wykonująca zapytanie do pobrania jednej wycieczki w celu sprawdzenia duplikatu
    function checkDuplicate(trip, fields, params) {
        // Zapytanie SQL
        const query = `
            SELECT id FROM trips
            WHERE name = ? AND description = ? AND period = ? AND price = ? AND country_id = ?
            AND id != ?
        `;
        const checkParams = [trip.name, trip.description, trip.period, trip.price, trip.country_id, id];

        // Wykonanie zapytania do pobrania jednej wycieczki w celu sprawdzenia duplikatu
        db.get(
            query,
            checkParams,
            (err, row) => {
                if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania wycieczki.' });
                if (row) return res.status(409).json({ error: 'Taka wycieczka już istnieje.' });
                runUpdate(trip, fields, params);
            }
        );
    }

    // Funkcja wykonująca polecenie do aktualizacji wycieczki
    function runUpdate(trip, fields, params) {
        // Zapytanie SQL
        const query = `
            UPDATE trips
            SET ${fields.join(', ')}
            WHERE id = ?
        `;

        // Wykonanie polecenia do aktualizacji wycieczki
        db.run(
            query,
            params,
            function (err) {
                if (err) return res.status(500).json({ error: 'Błąd serwera podczas aktualizowania wycieczki.' });
                if (this.changes === 0) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });

                // Log - aktualizacja wycieczki
                logAction(
                    req.user,
                    'UPDATE_TRIP',
                    `Zaktualizowano wycieczkę z ID ${id}`
                );

                res.status(200).json({ message: 'Wycieczka zaktualizowana.', trip: { id, ...trip } });
            }
        );
    }
};

// Usuwanie wycieczki
exports.deleteTrip = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID wycieczki.' });

    // Wykonanie zapytania do pobrania rezerwacji wycieczki
    db.get(
        'SELECT id FROM reservations WHERE trip_id = ? LIMIT 1', 
        [id], 
        (err, reservation) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji wycieczki.' });
            if (reservation) return res.status(400).json({ error: 'Nie można usunąć wycieczki, która posiada rezerwacje.' });

            // Wykonanie polecenia do usunięcia wycieczki
            db.run(
                'DELETE FROM trips WHERE id = ?',
                [id],
                function (err) {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas usuwania wycieczki.' });
                    if (this.changes === 0) return res.status(404).json({ error: 'Wycieczka o podanym ID nie istnieje.' });

                    // Log - usuwanie wycieczki
                    logAction(
                        req.user,
                        'DELETE_TRIP',
                        `Usunięto wycieczkę z ID ${id}`
                    );

                    res.status(200).json({ message: 'Wycieczka usunięta.', deletedId: id });
                }
            );
        }
    );
};

// Generowanie raportu PDF wszystkich wycieczek z obsługą filtrowania, sortowania i wyszukiwania
exports.generateTripsPDF = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'trips.id', order = 'asc', continent_name, continent_id, country_name, country_id } = req.query;

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
        id: 'trips.id',
        name: 'trips.name',
        description: 'trips.description',
        period: 'trips.period',
        price: 'trips.price',
        country_name: 'countries.name',
        country_id: 'countries.id',
        continent_name: 'continents.name',
        continent_id: 'continents.id'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'trips.id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie kontynentu, nazwie kraju lub nazwie wycieczki
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'continents.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'countries.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'trips.name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`];

    // Filtrowanie po nazwie kontynentu
    if (continent_name) {
        whereClause += ' AND continents.name = ?';
        params.push(continent_name);
    }

    // Filtrowanie po ID kontynentu
    if (continent_id) {
        whereClause += ' AND continents.id = ?';
        params.push(continent_id);
    }

    // Filtrowanie po nazwie kraju
    if (country_name) {
        whereClause += ' AND countries.name = ?';
        params.push(country_name);
    }

    // Filtrowanie po ID kraju
    if (country_id) {
        whereClause += ' AND countries.id = ?';
        params.push(country_id);
    }

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            trips.id,
            trips.name,
            trips.description,
            trips.period,
            trips.price,
            countries.id AS country_id,
            countries.name AS country_name,
            continents.id AS continent_id,
            continents.name AS continent_name
        FROM trips
        JOIN countries ON trips.country_id = countries.id
        JOIN continents ON countries.continent_id = continents.id
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
    `;

    // Wykonanie zapytania do pobrania wszystkich wycieczek
    db.all(
        query, 
        params, 
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=\"trips_report.pdf\"");

            const pdf = new PDFDocument({
                margin: 32,
                bufferPages: true
            })
            pdf.registerFont('dejavu', 'fonts/DejaVuSans.ttf');
            pdf.font('dejavu');
            pdf.pipe(res);

            // Nagłówek PDF
            pdf.fontSize(20).text("Raport wycieczek", { align: 'center' });
            pdf.moveDown(1);

            let startY = pdf.y;

            const margin = 32;
            const spacing = 6;

            const colIDWidth = 25;
            const colNameWidth = 189;
            const colContWidth = 67;
            const colCountryWidth = 75;
            const colPeriodWidth = 37;
            const colPriceWidth = 71;

            const colIDStart = margin + spacing;
            const colNameStart = colIDStart + colIDWidth + spacing + spacing;
            const colContStart = colNameStart + colNameWidth + spacing + spacing;
            const colCountryStart = colContStart + colContWidth + spacing + spacing;
            const colPeriodStart = colCountryStart + colCountryWidth + spacing + spacing;
            const colPriceStart = colPeriodStart + colPeriodWidth + spacing + spacing;
            const colEnd = colPriceStart + colPriceWidth + spacing;

            // Nagłówki tabeli
            pdf.fontSize(13);
            pdf.text("ID", colIDStart, startY);
            pdf.text("Wycieczka", colNameStart, startY);
            pdf.text("Kontynent", colContStart, startY);
            pdf.text("Kraj", colCountryStart, startY);
            pdf.text("Okres", colPeriodStart, startY);
            pdf.text("Cena (PLN)", colPriceStart, startY);
            pdf.moveDown(0.5);

            // Linie poziome
            pdf.moveTo(31.5, startY - 6).lineTo(568.5, startY - 6).stroke();
            pdf.moveTo(31.5, startY - 5.5).lineTo(568.5, startY - 5.5).stroke();
            pdf.moveTo(31.5, pdf.y - 0.38).lineTo(568.5, pdf.y - 0.38).stroke();
            pdf.moveTo(31.5, pdf.y + 0.12).lineTo(568.5, pdf.y + 0.12).stroke();

            // Linie pionowe
            pdf.moveTo(colIDStart - spacing, startY - 5.2).lineTo(colIDStart - spacing, pdf.y).stroke();
            pdf.moveTo(colNameStart - spacing, startY - 5.2).lineTo(colNameStart - spacing, pdf.y).stroke();
            pdf.moveTo(colContStart - spacing, startY - 5.2).lineTo(colContStart - spacing, pdf.y).stroke();
            pdf.moveTo(colCountryStart - spacing, startY - 5.2).lineTo(colCountryStart - spacing, pdf.y).stroke();
            pdf.moveTo(colPeriodStart - spacing, startY - 5.2).lineTo(colPeriodStart - spacing, pdf.y).stroke();
            pdf.moveTo(colPriceStart - spacing, startY - 5.2).lineTo(colPriceStart - spacing, pdf.y).stroke();
            pdf.moveTo(colEnd, startY - 5.2).lineTo(colEnd, pdf.y).stroke();

            let first = true;
            const oneLine = pdf.heightOfString("X", { width: colIDWidth });

            rows.forEach(row => {
                const safeName = row.name ? String(row.name) : "-";
                const safeCont = row.continent_name ? String(row.continent_name) : "-";
                const safeCountry = row.country_name ? String(row.country_name) : "-";
                const safePeriod = row.period ? String(row.period) : "-";
                const safePrice = row.price ? String(row.price) : "-";

                pdf.moveDown(0.3);

                let rowY = pdf.y;
                let rowStartY = pdf.y;

                const hID = pdf.heightOfString(String(row.id), { width: colIDWidth })
                const hName = pdf.heightOfString(safeName, { width: colNameWidth })
                const hCont = pdf.heightOfString(safeCont, { width: colContWidth })
                const hCountry = pdf.heightOfString(safeCountry, { width: colCountryWidth })
                const hPeriod = pdf.heightOfString(safePeriod, { width: colPeriodWidth })
                const hPrice = pdf.heightOfString(safePrice, { width: colPriceWidth })

                const rowHeight = Math.max(hID, hName, hCont, hCountry, hPeriod, hPrice)

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
                pdf.text(safeName, colNameStart, rowY, { width: colNameWidth });
                pdf.text(safeCont, colContStart, rowY, { width: colContWidth });
                pdf.text(safeCountry, colCountryStart, rowY, { width: colCountryWidth });
                pdf.text(safePeriod, colPeriodStart, rowY, { width: colPeriodWidth });
                pdf.text(safePrice, colPriceStart, rowY, { width: colPriceWidth });
                pdf.y = rowY + rowHeight
                
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
                pdf.moveTo(colNameStart - spacing, rowY - 3.85).lineTo(colNameStart - spacing, pdf.y).stroke();
                pdf.moveTo(colContStart - spacing, rowY - 3.85).lineTo(colContStart - spacing, pdf.y).stroke();
                pdf.moveTo(colCountryStart - spacing, rowY - 3.85).lineTo(colCountryStart - spacing, pdf.y).stroke();
                pdf.moveTo(colPeriodStart - spacing, rowY - 3.85).lineTo(colPeriodStart - spacing, pdf.y).stroke();
                pdf.moveTo(colPriceStart - spacing, rowY - 3.85).lineTo(colPriceStart - spacing, pdf.y).stroke();
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
                'GENERATE_REPORT_TRIPS', 
                'Wygenerowano raport PDF: trips'
            );
        }
    );
};