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

// Pobieranie wszystkich kontynentów z obsługą sortowania, wyszukiwania i paginacji
exports.getAllContinents = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'id', order = 'asc', page = 1, limit = 3 } = req.query;

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
        id: 'id',
        name: 'name',
        description: 'description',
        area: 'area'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie kontynentu
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`];

    // Zapytanie SQL z sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            id,
            name,
            description,
            area
        FROM continents
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT ? OFFSET ?
    `;

    // Dodanie limitu i przesunięcia do parametrów
    params.push(Number(limit), Number(offset));

    // Wykonanie zapytania do pobrania wszystkich kontynentów
    db.all(
        query,
        params,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kontynentów.' });
            if (!rows || rows.length === 0) return res.status(200).json({ message: 'Nie znaleziono żadnych kontynentów.', data: [] });
            res.status(200).json({ message: 'Pobrano kontynenty.', data: rows });
        }
    );
};

// Pobieranie jednego kontynentu
exports.getContinent = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID kontynentu.' });

    // Zapytanie SQL
    const query = `
        SELECT 
            id,
            name,
            description,
            area
        FROM continents
        WHERE id = ?
    `;

    // Wykonanie zapytania do pobrania jednego kontynentu
    db.get(
        query,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kontynentu.' });
            if (!row) return res.status(404).json({ error: 'Kontynent o podanym ID nie istnieje.' });
            res.status(200).json({ message: 'Pobrano jeden kontynent.', data: row });
        }
    );
};

// Dodawanie nowego kontynentu
exports.addContinent = (req, res) => {
    // Pobranie parametrów przesłanych w ciele żądania
    const { name, description, area } = req.body;

    // Walidacja wymaganych danych
    if (!name || !description || area == null) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    // Walidacja typów danych
    const numericArea = Number(area);
    if (isNaN(numericArea)) return res.status(400).json({ error: `Parametr 'area' musi być liczbą.` });
    if (numericArea <= 0) return res.status(400).json({ error: `Parametr 'area' musi być większy od zera.` });
    const roundedArea = Math.ceil(numericArea);

    // Wykonanie polecenia do dodania nowego kontynentu
    db.run(
        'INSERT INTO continents (name, description, area) VALUES (?, ?, ?)',
        [name, description, roundedArea],
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Kontynent o podanej nazwie już istnieje.' });
                return res.status(500).json({ error: 'Błąd serwera podczas dodawania kontynentu.' });
            }

            // Log - dodanie kontynentu
            logAction(
                req.user,
                'ADD_CONTINENT',
                `Dodano kontynent z ID ${this.lastID}`
            );

            res.status(201).json({ message: 'Nowy kontynent dodany.', continent: { id: this.lastID, name, description, area: roundedArea } });
        }
    );
};

// Aktualizacja kontynentu
exports.updateContinent = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Pobranie parametrów przesłanych w ciele żądania
    const { name, description, area } = req.body;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID kontynentu.' });

    // Walidacja jakichkolwiek danych
    if (!name && !description && area === undefined) return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });

    // Walidacja typów danych
    if (area !== undefined && area !== "") {
        const numericArea = Number(area);
        if (isNaN(numericArea)) return res.status(400).json({ error: `Parametr 'area' musi być liczbą.` });
        if (numericArea <= 0) return res.status(400).json({ error: `Parametr 'area' musi być większy od zera.` });
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

    // Czy nie ma żadnych pól do aktualizacji
    if (fields.length === 0) {
        return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });
    }

    // Dodanie ID do końca listy parametrów
    params.push(id);

    // Zapytanie SQL
    const query = `
        UPDATE continents 
        SET ${fields.join(', ')} 
        WHERE id = ?
    `;

    // Wykonanie polecenia do aktualizacji kontynentu
    db.run(
        query,
        params,
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Kontynent o podanej nazwie już istnieje.' });
                return res.status(500).json({ error: 'Błąd serwera podczas aktualizacji kontynentu.' });
            }
            if (this.changes === 0) return res.status(404).json({ error: 'Kontynent o podanym ID nie istnieje.' });

            // Log - aktualizacja kontynentu
            logAction(
                req.user,
                'UPDATE_CONTINENT',
                `Zaktualizowano kontynent z ID ${id}`
            );

            res.status(200).json({ message: 'Kontynent zaktualizowany.', continent: { id, name, description, area } });
        }
    );
};

// Usuwanie kontynentu
exports.deleteContinent = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID kontynentu.' });

    // Wykonanie zapytania do pobrania ilości krajów
    db.get(
        'SELECT COUNT(*) AS countryCount FROM countries WHERE continent_id = ?',
        [id],
        (err, countryRow) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania ilości krajów.' });

            if (countryRow.countryCount > 0) {
                // Kontynent ma kraje

                // Wykonanie zapytania do pobrania ilości wycieczek
                db.get(
                    'SELECT COUNT(*) AS tripCount FROM trips JOIN countries ON trips.country_id = countries.id WHERE countries.continent_id = ?',
                    [id],
                    (err, tripRow) => {
                        if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania ilości wycieczek.' });
                        if (tripRow.tripCount > 0) return res.status(400).json({ error: 'Nie można usunąć kontynentu, który ma przypisane kraje z przypisanymi wycieczkami.' });
                        return res.status(400).json({ error: 'Nie można usunąć kontynentu, który ma przypisane kraje.' });
                    }
                );
            } else {
                // Kontynent nie ma krajów

                // Wykonanie polecenia do usunięcia kontynentu
                db.run(
                    'DELETE FROM continents WHERE id = ?',
                    [id],
                    function (err) {
                        if (err) return res.status(500).json({ error: 'Błąd serwera podczas usuwania kontynentu.' });
                        if (this.changes === 0) return res.status(404).json({ error: 'Kontynent o podanym ID nie istnieje.' });

                        // Log - usuwanie kontynentu
                        logAction(
                            req.user,
                            'DELETE_CONTINENT',
                            `Usunięto kontynent z ID ${id}`
                        );

                        res.status(200).json({ message: 'Kontynent usunięty.', deletedId: id });
                    }
                );
            }
        }
    );
};

// Generowanie raportu PDF wszystkich kontynentów z obsługą sortowania i wyszukiwania
exports.generateContinentsPDF = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'id', order = 'asc' } = req.query;

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
        id: 'id',
        name: 'name',
        description: 'description',
        area: 'area'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po nazwie kontynentu
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`];

    // Zapytanie SQL z sortowaniem i wyszukiwaniem
    const query = `
        SELECT 
            id,
            name,
            description,
            area
        FROM continents
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
    `;

    // Wykonanie zapytania do pobrania wszystkich kontynentów
    db.all(
        query, 
        params, 
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania kontynentów.' });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="continents_report.pdf"');

            const pdf = new PDFDocument({
                margin: 32,
                bufferPages: true
            })
            pdf.registerFont('dejavu', 'fonts/DejaVuSans.ttf');
            pdf.font('dejavu');
            pdf.pipe(res);

            // Nagłówek PDF
            pdf.fontSize(20).text("Raport kontynentów", { align: 'center' });
            pdf.moveDown(1);

            let startY = pdf.y;

            const margin = 32;
            const spacing = 6;

            const colIDWidth = 25
            const colNameWidth = 67
            const colAreaWidth = 70
            const colDescWidth = 326

            const colIDStart = margin + spacing;
            const colNameStart = colIDStart + colIDWidth + spacing + spacing;
            const colAreaStart = colNameStart + colNameWidth + spacing + spacing;
            const colDescStart = colAreaStart + colAreaWidth + spacing + spacing;
            const colDescEnd = colDescStart + colDescWidth + spacing

            // Nagłówki tabeli
            pdf.fontSize(13);
            pdf.text("ID", colIDStart, startY);
            pdf.text("Kontynent", colNameStart, startY);
            pdf.text("Pow. (km²)", colAreaStart, startY);
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
            pdf.moveTo(colAreaStart - spacing, startY - 5.2).lineTo(colAreaStart - spacing, pdf.y).stroke();
            pdf.moveTo(colDescStart - spacing, startY - 5.2).lineTo(colDescStart - spacing, pdf.y).stroke();
            pdf.moveTo(colDescEnd, startY - 5.2).lineTo(colDescEnd, pdf.y).stroke();

            let first = true;
            const oneLine = pdf.heightOfString("X", { width: colIDWidth });

            rows.forEach(row => {
                const safeName = row.name ? String(row.name) : '-';
                const safeArea = row.area ? String(row.area.toLocaleString()) : '-';
                const safeDesc = row.description ? String(row.description) : '-';

                pdf.moveDown(0.3);

                let rowY = pdf.y;
                let rowStartY = pdf.y;

                const hID = pdf.heightOfString(String(row.id), { width: colIDWidth })
                const hName = pdf.heightOfString(safeName, { width: colNameWidth })
                const hArea = pdf.heightOfString(safeArea, { width: colAreaWidth })
                const hDesc = pdf.heightOfString(safeDesc, { width: colDescWidth })

                const rowHeight = Math.max(hID, hName, hArea, hDesc)

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
                pdf.text(safeArea, colAreaStart, rowY, { width: colAreaWidth });
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
                pdf.moveTo(colAreaStart - spacing, rowY - 3.85).lineTo(colAreaStart - spacing, pdf.y).stroke();
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
                'GENERATE_REPORT_CONTINENTS', 
                'Wygenerowano raport PDF: continents'
            );
        }
    );
};