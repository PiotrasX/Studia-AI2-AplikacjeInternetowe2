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

// Pobieranie wszystkich krajów z obsługą filtrowania, sortowania, wyszukiwania i paginacji
exports.getAllCountries = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'countries.id', order = 'asc', continent_name, continent_id, page = 1, limit = 10 } = req.query;

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
        id: 'countries.id',
        name: 'countries.name',
        description: 'countries.description',
        area: 'countries.area',
        population: 'countries.population',
        continent_name: 'continents.name',
        continent_id: 'continents.id'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'countries.id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie kontynentu lub nazwie kraju
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'continents.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'countries.name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`];

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

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            countries.id,
            countries.name,
            countries.description,
            countries.area,
            countries.population,
            continents.id AS continent_id,
            continents.name AS continent_name
        FROM countries
        JOIN continents ON countries.continent_id = continents.id
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT ? OFFSET ?
    `;

    // Dodanie limitu i przesunięcia do parametrów
    params.push(Number(limit), Number(offset));

    // Wykonanie zapytania do pobrania wszystkich krajów
    db.all(
        query,
        params,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania krajów.' });
            if (!rows || rows.length === 0) return res.status(200).json({ message: 'Nie znaleziono żadnych krajów.', data: [] });
            res.status(200).json({ message: 'Pobrano kraje.', data: rows });
        }
    );
};

// Pobieranie jednego kraju
exports.getCountry = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID kraju.' });

    // Zapytanie SQL
    const query = `
        SELECT 
            countries.id,
            countries.name,
            countries.description,
            countries.area,
            countries.population,
            continents.id AS continent_id,
            continents.name AS continent_name
        FROM countries
        JOIN continents ON countries.continent_id = continents.id
        WHERE countries.id = ?
    `;

    // Wykonanie zapytania do pobrania jednego kraju
    db.get(
        query,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kraju.' });
            if (!row) return res.status(404).json({ error: 'Kraj o podanym ID nie istnieje.' });
            res.status(200).json({ message: 'Pobrano jeden kraj.', data: row });
        }
    );
};

// Dodawanie nowego kraju
exports.addCountry = (req, res) => {
    // Pobranie parametrów przesłanych w ciele żądania
    const { name, description, area, population, continent_id } = req.body;

    // Walidacja wymaganych danych
    if (!name || !description || area == null || population == null || continent_id == null) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    // Walidacja typów danych
    const numericArea = Number(area);
    if (isNaN(numericArea)) return res.status(400).json({ error: `Parametr 'area' musi być liczbą.` });
    if (numericArea <= 0) return res.status(400).json({ error: `Parametr 'area' musi być większy od zera.` });
    const roundedArea = Math.ceil(numericArea);
    
    const numericPopulation = Number(population);
    if (isNaN(numericPopulation)) return res.status(400).json({ error: `Parametr 'population' musi być liczbą.` });
    if (numericPopulation <= 0) return res.status(400).json({ error: `Parametr 'population' musi być większy od zera.` });
    const roundedPopulation = Math.ceil(numericPopulation);

    // Wykonanie zapytania do pobrania jednego kontynentu
    db.get(
        'SELECT id FROM continents WHERE id = ?',
        [continent_id],
        (err, continent) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kontynentu.' });
            if (!continent) return res.status(404).json({ error: 'Kontynent o podanym ID nie istnieje.' });

            // Wykonanie polecenia do dodania nowego kraju
            db.run(
                'INSERT INTO countries (name, description, area, population, continent_id) VALUES (?, ?, ?, ?, ?)',
                [name, description, roundedArea, roundedPopulation, continent_id],
                function (err) {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Kraj o podanej nazwie już istnieje.' });
                        return res.status(500).json({ error: 'Błąd serwera podczas dodawania kraju.' });
                    }

                    // Log - dodawanie kraju
                    logAction(
                        req.user,
                        'ADD_COUNTRY',
                        `Dodano kraj z ID ${this.lastID}`
                    );

                    res.status(201).json({ message: 'Nowy kraj dodany.', country: { id: this.lastID, name, description, area: roundedArea, population: roundedPopulation, continent_id } });
                }
            );
        }
    );
};

// Aktualizacja kraju
exports.updateCountry = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Pobranie parametrów przesłanych w ciele żądania
    const { name, description, area, population, continent_id } = req.body;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID kraju.' });

    // Walidacja jakichkolwiek danych
    if (!name && !description && area === undefined && population === undefined && continent_id === undefined) return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });

    // Walidacja typów danych
    if (area !== undefined && area !== "") {
        const numericArea = Number(area);
        if (isNaN(numericArea)) return res.status(400).json({ error: `Parametr 'area' musi być liczbą.` });
        if (numericArea <= 0) return res.status(400).json({ error: `Parametr 'area' musi być większy od zera.` });
    }
    if (population !== undefined && population !== "") {
        const numericPopulation = Number(population);
        if (isNaN(numericPopulation)) return res.status(400).json({ error: `Parametr 'population' musi być liczbą.` });
        if (numericPopulation <= 0) return res.status(400).json({ error: `Parametr 'population' musi być większy od zera.` });
    }

    // Dynamiczne budowanie zapytania
    let fields = [];
    let params = [];

    if (name) { fields.push('name = ?'); params.push(name); }
    if (description) { fields.push('description = ?'); params.push(description); }
    if (area !== undefined && area !== "") { 
        const numericArea = Number(area);
        const roundedArea = Math.ceil(numericArea);
        fields.push('area = ?'); 
        params.push(roundedArea); 
    }
    if (population !== undefined && population !== "") { 
        const numericPopulation = Number(population);
        const roundedPopulation = Math.ceil(numericPopulation);
        fields.push('population = ?'); 
        params.push(roundedPopulation); 
    }
    if (continent_id !== undefined) { fields.push('continent_id = ?'); params.push(continent_id); }

    // Czy nie ma żadnych pól do aktualizacji
    if (fields.length === 0) {
        return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });
    }

    // Dodanie ID do końca listy parametrów
    params.push(id);

    // Zapytanie SQL
    const query = `
        UPDATE countries 
        SET ${fields.join(', ')} 
        WHERE id = ?
    `;

    // Jeśli podano continent_id
    if (continent_id !== undefined) {
        // Wykonanie zapytania do pobrania jednego kontynentu
        db.get(
            'SELECT id FROM continents WHERE id = ?',
            [continent_id],
            (err, continent) => {
                if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kontynentu.' });
                if (!continent) return res.status(404).json({ error: 'Kontynent o podanym ID nie istnieje.' });
                runUpdate();
            }
        );
    // Nie podano continent_id
    } else {
        runUpdate();
    }

    // Funkcja wykonująca polecenie do aktualizacji kraju
    function runUpdate() {
        // Wykonanie polecenia do aktualizacji kraju
        db.run(
            query,
            params,
            function (err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Kraj o podanej nazwie już istnieje.' });
                    return res.status(500).json({ error: 'Błąd serwera podczas aktualizowania kraju.' });
                }
                if (this.changes === 0) return res.status(404).json({ error: 'Kraj o podanym ID nie istnieje.' });

                // Log - aktualizacja kraju
                logAction(
                    req.user,
                    'UPDATE_COUNTRY',
                    `Zaktualizowano kraj z ID ${id}`
                );

                res.status(200).json({ message: 'Kraj zaktualizowany.', country: { id, name, description, area, population, continent_id } });
            }
        );
    }
};

// Usuwanie kraju
exports.deleteCountry = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID kraju.' });

    // Wykonanie zapytania do pobrania ilości wycieczek
    db.get(
        'SELECT COUNT(*) AS count FROM trips WHERE country_id = ?',
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania ilości wycieczek.' });
            if (row.count > 0) return res.status(400).json({ error: 'Nie można usunąć kraju, który ma przypisane wycieczki.' });

            // Wykonanie polecenia do usunięcia kraju
            db.run(
                'DELETE FROM countries WHERE id = ?',
                [id],
                function (err) {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas usuwania kraju.' });
                    if (this.changes === 0) return res.status(404).json({ error: 'Kraj o podanym ID nie istnieje.' });

                    // Log - usuwanie kraju
                    logAction(
                        req.user,
                        'DELETE_COUNTRY',
                        `Usunięto kraj z ID ${id}`
                    );

                    res.status(200).json({ message: 'Kraj usunięty.', deletedId: id });
                }
            );
        }
    );
};

// Generowanie raportu PDF wszystkich krajów z obsługą filtrowania, sortowania i wyszukiwania
exports.generateCountriesPDF = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'countries.id', order = 'asc', continent_name, continent_id } = req.query;

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
        id: 'countries.id',
        name: 'countries.name',
        description: 'countries.description',
        area: 'countries.area',
        population: 'countries.population',
        continent_name: 'continents.name',
        continent_id: 'continents.id'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'countries.id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie kontynentu lub nazwie kraju
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'continents.name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'countries.name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`];

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

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            countries.id,
            countries.name,
            countries.description,
            countries.area,
            countries.population,
            continents.id AS continent_id,
            continents.name AS continent_name
        FROM countries
        JOIN continents ON countries.continent_id = continents.id
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
    `;

    // Wykonanie zapytania do pobrania wszystkich krajów
    db.all(
        query, 
        params, 
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania krajów.' });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="countries_report.pdf"');

            const pdf = new PDFDocument({
                margin: 32,
                bufferPages: true
            })
            pdf.registerFont('dejavu', 'fonts/DejaVuSans.ttf');
            pdf.font('dejavu');
            pdf.pipe(res);

            // Nagłówek PDF
            pdf.fontSize(20).text("Raport krajów", { align: 'center' });
            pdf.moveDown(1);

            let startY = pdf.y;

            const margin = 32;
            const spacing = 6;

            const colIDWidth = 25;
            const colNameWidth = 75;  
            const colContWidth = 67;
            const colAreaWidth = 70;
            const colPopWidth = 70;
            const colDescWidth = 157;

            const colIDStart = margin + spacing;
            const colNameStart = colIDStart + colIDWidth + spacing + spacing;
            const colContStart = colNameStart + colNameWidth + spacing + spacing;
            const colAreaStart = colContStart + colContWidth + spacing + spacing;
            const colPopStart = colAreaStart + colAreaWidth + spacing + spacing;
            const colDescStart = colPopStart + colPopWidth + spacing + spacing;
            const colDescEnd = colDescStart + colDescWidth + spacing;

            // Nagłówki tabeli
            pdf.fontSize(13);
            pdf.text("ID", colIDStart, startY);
            pdf.text("Kraj", colNameStart, startY);
            pdf.text("Kontynent", colContStart, startY);
            pdf.text("Pow. (km²)", colAreaStart, startY);
            pdf.text("Ludność", colPopStart, startY);
            pdf.text("Opis", colDescStart, startY);
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
            pdf.moveTo(colAreaStart - spacing, startY - 5.2).lineTo(colAreaStart - spacing, pdf.y).stroke();
            pdf.moveTo(colPopStart - spacing, startY - 5.2).lineTo(colPopStart - spacing, pdf.y).stroke();
            pdf.moveTo(colDescStart - spacing, startY - 5.2).lineTo(colDescStart - spacing, pdf.y).stroke();
            pdf.moveTo(colDescEnd, startY - 5.2).lineTo(colDescEnd, pdf.y).stroke();

            let first = true;
            const oneLine = pdf.heightOfString("X", { width: colIDWidth });
            
            rows.forEach(row => {
                const safeName = row.name ? String(row.name) : '-';
                const safeCont = row.continent_name ? String(row.continent_name) : '-';
                const safeArea = row.area ? String(row.area.toLocaleString()) : '-';
                const safePop = row.population ? String(row.population.toLocaleString()) : '-';
                const safeDesc = row.description ? String(row.description) : '-'

                pdf.moveDown(0.3);
                
                let rowY = pdf.y;
                let rowStartY = pdf.y;
                
                const hID = pdf.heightOfString(String(row.id), { width: colIDWidth })
                const hName = pdf.heightOfString(safeName, { width: colNameWidth })
                const hCont = pdf.heightOfString(safeCont, { width: colContWidth })
                const hArea = pdf.heightOfString(safeArea, { width: colAreaWidth })
                const hPop = pdf.heightOfString(safePop, { width: colPopWidth })
                const hDesc = pdf.heightOfString(safeDesc, { width: colDescWidth })

                const rowHeight = Math.max(hID, hName, hCont, hArea, hPop, hDesc)

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
                pdf.text(safeArea, colAreaStart, rowY, { width: colAreaWidth });
                pdf.text(safePop, colPopStart, rowY, { width: colPopWidth });
                pdf.text(safeDesc, colDescStart, rowY, { width: colDescWidth });
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
                pdf.moveTo(colAreaStart - spacing, rowY - 3.85).lineTo(colAreaStart - spacing, pdf.y).stroke();
                pdf.moveTo(colPopStart - spacing, rowY - 3.85).lineTo(colPopStart - spacing, pdf.y).stroke();
                pdf.moveTo(colDescStart - spacing, rowY - 3.85).lineTo(colDescStart - spacing, pdf.y).stroke();
                pdf.moveTo(colDescEnd, rowY - 3.85).lineTo(colDescEnd, pdf.y).stroke();
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
                'GENERATE_REPORT_COUNTRIES',
                'Wygenerowano raport PDF: countries'
            );
        }
    );
};