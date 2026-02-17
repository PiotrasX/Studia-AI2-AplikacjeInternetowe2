// Import połączenia z bazą danych
const db = require('../db/database');

// Import bibliotek
const PDFDocument = require('pdfkit');
const { logAction } = require('../utils/logger');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Klucz JWT
const JWT_SECRET = process.env.JWT_SECRET || 'domyslny_tajny_klucz';

// Pomocnicza funkcja do walidacji i standaryzacji adresu e-mail
function validateAndNormalizeEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(normalized)) return null;
    return normalized;
}

// Wyszukiwanie z normalizacją polskich znaków diakrytycznych
function normalize(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[łŁ]/g, "l")
        .toLowerCase();
}

// Pobieranie wszystkich użytkowników z obsługą filtrowania, sortowania, wyszukiwania i paginacji
exports.getAllUsers = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'id', order = 'asc', first_name, last_name, email, role, page = 1, limit = 5 } = req.query;

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
        first_name: 'first_name',
        last_name: 'last_name',
        email: 'email',
        role: 'role'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po adresie e-mail, imieniu lub nazwisku
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'email')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'first_name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'last_name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`];

    // Filtrowanie po imieniu
    if (first_name) {
        whereClause += ' AND first_name = ?';
        params.push(first_name);
    }

    // Filtrowanie po nazwisku
    if (last_name) {
        whereClause += ' AND last_name = ?';
        params.push(last_name);
    }

    // Filtrowanie po adresie e-mail
    if (email) {
        whereClause += ' AND email = ?';
        params.push(email);
    }

    // Filtrowanie po roli
    if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
    }

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            id,
            first_name,
            last_name,
            email,
            role
        FROM users
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT ? OFFSET ?
    `;

    // Dodanie limitu i przesunięcia do parametrów
    params.push(Number(limit), Number(offset));

    // Wykonanie zapytania do pobrania wszystkich użytkowników
    db.all(
        query,
        params,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkowników.' });
            if (!rows || rows.length === 0) return res.status(200).json({ message: 'Nie znaleziono żadnych użytkowników.', data: [] });
            res.status(200).json({ message: 'Pobrano użytkowników.', data: rows });
        }
    );
};

// Pobieranie jednego użytkownika
exports.getUser = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID użytkownika.' });

    // Zapytanie SQL
    const query = `
        SELECT 
            id,
            first_name,
            last_name,
            email,
            role
        FROM users
        WHERE id = ?
    `;

    // Wykonanie zapytania do pobrania jednego użytkownika
    db.get(
        query,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
            if (!row) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });
            res.status(200).json({ message: 'Pobrano jednego użytkownika.', data: row });
        }
    );
};

// Dodawanie nowego użytkownika
exports.addUser = (req, res) => {
    // Pobranie parametrów przesłanych w ciele żądania
    const { first_name, last_name, email, password, role = 'user' } = req.body;

    // Walidacja wymaganych danych
    if (!first_name || !last_name || !email || !password) return res.status(400).json({ error: 'Brak wymaganych danych.' });

    // Walidacja typów danych
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Nieprawidłowa rola użytkownika.' });

    const normalizedEmail = validateAndNormalizeEmail(email);
    if (!normalizedEmail) return res.status(400).json({ error: 'Nieprawidłowy adres e-mail.' });

    // Haszowanie hasła
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Wykonanie polecenia do dodania nowego użytkownika
    db.run(
        'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [first_name, last_name, normalizedEmail, hashedPassword, role],
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Użytkownik o podanym adresie e-mail już istnieje.' });
                return res.status(500).json({ error: 'Błąd serwera podczas dodawania użytkownika.' });
            }

            // Log - dodanie użytkownika
            logAction(
                req.user, 
                'ADD_USER', 
                `Dodano użytkownika z ID: ${this.lastID}`
            );

            res.status(201).json({ message: 'Nowy użytkownik dodany.', user: { id: this.lastID, first_name, last_name, email: normalizedEmail, role } });
        }
    );
};

// Aktualizacja użytkownika
exports.updateUser = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Pobranie parametrów przesłanych w ciele żądania
    const { first_name, last_name, email, password, role } = req.body;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID użytkownika.' });

    // Walidacja jakichkolwiek danych
    if (!first_name && !last_name && !email && !password && !role) return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });

    // Walidacja typów danych
    if (role && !['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Nieprawidłowa rola użytkownika.' });

    // Czy administrator nie zmienia swojej roli z admin na user
    if (role && req.user && Number(req.user.id) === Number(id) && role === 'user') return res.status(403).json({ error: 'Nie można zdegradować swojego własnego konta.' });

    // Wykonanie zapytania do pobrania jednego użytkownika
    db.get(
        'SELECT role FROM users WHERE id = ?', 
        [id], 
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
            if (!user) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });
            if (user.role === 'admin' && role === 'user') return res.status(403).json({ error: 'Nie można zdegradować innego administratora.' });

            // Dynamiczne budowanie zapytania
            let fields = [];
            let params = [];

            if (first_name) { fields.push('first_name = ?'); params.push(first_name); }
            if (last_name) { fields.push('last_name = ?'); params.push(last_name); }
            if (email) { 
                const normalizedEmail = validateAndNormalizeEmail(email);
                if (!normalizedEmail) return res.status(400).json({ error: 'Nieprawidłowy adres e-mail.' });
                fields.push('email = ?'); 
                params.push(normalizedEmail); 
            }
            if (password) { const hashedPassword = bcrypt.hashSync(password, 10); fields.push('password = ?'); params.push(hashedPassword); }
            if (role) { fields.push('role = ?'); params.push(role); }

            // Czy nie ma żadnych pól do aktualizacji
            if (fields.length === 0) {
                return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });
            }

            // Dodanie ID do końca listy parametrów
            params.push(id);

            // Zapytanie SQL
            const query = `
                UPDATE users 
                SET ${fields.join(', ')} 
                WHERE id = ?
            `;

            // Wykonanie polecenia do aktualizacji użytkownika
            db.run(
                query,
                params,
                function (err) {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Użytkownik o podanym adresie e-mail już istnieje.' });
                        return res.status(500).json({ error: 'Błąd serwera podczas aktualizacji użytkownika.' });
                    }
                    if (this.changes === 0) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });

                    // Log - aktualizacja użytkownika
                    logAction(
                        req.user, 
                        'UPDATE_USER', 
                        `Zaktualizowano użytkownika z ID ${id}`
                    );

                    res.status(200).json({ message: 'Użytkownik zaktualizowany.', user: { id, first_name, last_name, email, role } });
                }
            );
        }
    );
};

// Usuwanie użytkownika
exports.deleteUser = (req, res) => {
    // Pobranie parametru z URL
    const { id } = req.params;

    // Walidacja ID
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Nieprawidłowy ID użytkownika.' });

    // Czy zalogowany użytkownik próbuje usunąć samego siebie
    if (req.user && Number(req.user.id) === Number(id)) return res.status(403).json({ error: 'Nie można usunąć swojego własnego konta.' });

    // Wykonanie zapytania do pobrania jednego użytkownika
    db.get(
        'SELECT role FROM users WHERE id = ?', 
        [id], 
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania użytkownika.' });
            if (!user) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });
            if (user.role === 'admin')  return res.status(403).json({ error: 'Nie można usunąć innego administratora.' });
            
            // Wykonanie zapytania do pobrania rezerwacji użytkownika
            db.get(
                'SELECT id FROM reservations WHERE user_id = ? LIMIT 1', 
                [id], 
                (err, reservation) => {
                    if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji użytkownika.' });
                    if (reservation) return res.status(400).json({ error: 'Nie można usunąć użytkownika, który posiada rezerwacje.' });

                    // Wykonanie polecenia do usunięcia użytkownika
                    db.run(
                        'DELETE FROM users WHERE id = ?',
                        [id],
                        function (err) {
                            if (err) return res.status(500).json({ error: 'Błąd serwera podczas usuwania użytkownika.' });
                            if (this.changes === 0) return res.status(404).json({ error: 'Użytkownik o podanym ID nie istnieje.' });

                            // Log - usunięcie użytkownika
                            logAction(
                                req.user, 
                                'DELETE_USER', 
                                `Usunięto użytkownika z ID ${id}`
                            );

                            res.status(200).json({ message: 'Użytkownik usunięty.', deletedId: id });
                        }
                    );
                }
            );
        }
    );
};

// Pobieranie własnych danych zalogowanego użytkownika
exports.getOwnProfile = (req, res) => {
    // Pobranie ID zalogowanego użytkownika
    const userId = req.user.id;

    // Zapytanie SQL
    const query = `
        SELECT 
            id,
            first_name,
            last_name,
            email,
            role
        FROM users
        WHERE id = ?
    `;

    // Wykonanie zapytania do pobrania własnych danych zalogowanego użytkownika
    db.get(
        query,
        [userId],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania profilu użytkownika.' });
            if (!row) return res.status(404).json({ error: 'Nie znaleziono profilu użytkownika.' });
            res.status(200).json({ message: 'Pobrano profil użytkownika.', data: row });
    });
};

// Aktualizacja własnych danych zalogowanego użytkownika
exports.updateOwnProfile = (req, res) => {
    // Pobranie ID zalogowanego użytkownika
    const userId = req.user.id;

    // Pobranie parametrów przesłanych w ciele żądania
    const { first_name, last_name, email, password } = req.body;

    // Walidacja jakichkolwiek danych
    if (!first_name && !last_name && !email && !password) return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });

    // Dynamiczne budowanie zapytania
    let fields = [];
    let params = [];

    if (first_name) { fields.push('first_name = ?'); params.push(first_name); }
    if (last_name) { fields.push('last_name = ?'); params.push(last_name); }
    let normalizedEmail = null;
    if (email) { 
        normalizedEmail = validateAndNormalizeEmail(email);
        if (!normalizedEmail) return res.status(400).json({ error: 'Nieprawidłowy adres e-mail.' });
        fields.push('email = ?'); 
        params.push(normalizedEmail); 
    }
    if (password) { const hashedPassword = bcrypt.hashSync(password, 10); fields.push('password = ?'); params.push(hashedPassword); }

    // Czy nie ma żadnych pól do aktualizacji
    if (fields.length === 0) {
        return res.status(400).json({ error: 'Brak jakichkolwiek danych.' });
    }

    // Dodanie ID do końca listy parametrów
    params.push(userId);

    // Zapytanie SQL
    const query = `
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = ?
    `;

    // Wykonanie polecenia do aktualizacji własnych danych zalogowanego użytkownika
    db.run(
        query,
        params,
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Użytkownik o podanym adresie e-mail już istnieje.' });
                return res.status(500).json({ error: 'Błąd serwera podczas aktualizacji profilu użytkownika.' });
            }

            const updatedUser = {
                id: userId,
                first_name,
                last_name,
                email: normalizedEmail,
                role: req.user.role
            };
            const token = jwt.sign(
                { id: userId, email: normalizedEmail, role: req.user.role },
                JWT_SECRET,
                { expiresIn: '2h' }
            );

            // Log - aktualizacja profilu
            logAction(
                req.user, 
                'UPDATE_OWN_PROFILE', 
                `Użytkownik z ID ${userId} zaktualizował własny profil`
            );

            res.status(200).json({ message: 'Profil użytkownika zaktualizowany.', user: updatedUser, token });
        }
    );
};

// Generowanie raportu PDF wszystkich użytkowników z obsługą filtrowania, sortowania i wyszukiwania
exports.generateUsersPDF = (req, res) => {
    // Pobranie parametrów zapytania z URL
    const { search = '', sort = 'id', order = 'asc', first_name, last_name, email, role } = req.query;

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
        first_name: 'first_name',
        last_name: 'last_name',
        email: 'email',
        role: 'role'
    };
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort = allowedSortFields[sort] ? allowedSortFields[sort] : 'id';
    const safeOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Warunek wyszukiwania po adresie e-mail, imieniu lub nazwisku
    let whereClause = `
        WHERE (
            LOWER(${normalizeSQL.replace(/col/g, 'email')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'first_name')}) LIKE ?
            OR LOWER(${normalizeSQL.replace(/col/g, 'last_name')}) LIKE ?
        )
    `;
    const params = [`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`];

    // Filtrowanie po imieniu
    if (first_name) {
        whereClause += ' AND first_name = ?';
        params.push(first_name);
    }

    // Filtrowanie po nazwisku
    if (last_name) {
        whereClause += ' AND last_name = ?';
        params.push(last_name);
    }

    // Filtrowanie po adresie e-mail
    if (email) {
        whereClause += ' AND email = ?';
        params.push(email);
    }

    // Filtrowanie po roli
    if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
    }

    // Zapytanie SQL z filtrowaniem, sortowaniem, wyszukiwaniem i paginacją
    const query = `
        SELECT 
            id,
            first_name,
            last_name,
            email,
            role
        FROM users
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
    `;

    // Wykonanie zapytania do pobrania wszystkich użytkowników
    db.all(
        query, 
        params, 
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Błąd serwera podczas pobierania rezerwacji.' });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=\"users_report.pdf\"");

            const pdf = new PDFDocument({
                margin: 32,
                bufferPages: true
            })
            pdf.registerFont('dejavu', 'fonts/DejaVuSans.ttf');
            pdf.font('dejavu');
            pdf.pipe(res);

            // Nagłówek PDF
            pdf.fontSize(20).text("Raport użytkowników", { align: 'center' });
            pdf.moveDown(1);

            let startY = pdf.y;

            const margin = 32;
            const spacing = 6;

            const colIDWidth = 25;
            const colFirstWidth = 80;
            const colLastWidth = 80;
            const colEmailWidth = 216;
            const colRoleWidth = 75;

            const colIDStart = margin + spacing;
            const colFirstStart = colIDStart + colIDWidth + spacing + spacing;
            const colLastStart = colFirstStart + colFirstWidth + spacing + spacing;
            const colEmailStart = colLastStart + colLastWidth + spacing + spacing;
            const colRoleStart = colEmailStart + colEmailWidth + spacing + spacing;
            const colEnd = colRoleStart + colRoleWidth + spacing;

            // Nagłówki tabeli
            pdf.fontSize(13);
            pdf.text("ID", colIDStart, startY);
            pdf.text("Imię", colFirstStart, startY);
            pdf.text("Nazwisko", colLastStart, startY);
            pdf.text("E-mail", colEmailStart, startY);
            pdf.text("Rola", colRoleStart, startY);
            pdf.moveDown(0.5);

            // Linie poziome
            pdf.moveTo(31.5, startY - 6).lineTo(568.5, startY - 6).stroke();
            pdf.moveTo(31.5, startY - 5.5).lineTo(568.5, startY - 5.5).stroke();
            pdf.moveTo(31.5, pdf.y - 0.38).lineTo(568.5, pdf.y - 0.38).stroke();
            pdf.moveTo(31.5, pdf.y + 0.12).lineTo(568.5, pdf.y + 0.12).stroke();

            // Linie pionowe
            pdf.moveTo(colIDStart - spacing, startY - 5.2).lineTo(colIDStart - spacing, pdf.y).stroke();
            pdf.moveTo(colFirstStart - spacing, startY - 5.2).lineTo(colFirstStart - spacing, pdf.y).stroke();
            pdf.moveTo(colLastStart - spacing, startY - 5.2).lineTo(colLastStart - spacing, pdf.y).stroke();
            pdf.moveTo(colEmailStart - spacing, startY - 5.2).lineTo(colEmailStart - spacing, pdf.y).stroke();
            pdf.moveTo(colRoleStart - spacing, startY - 5.2).lineTo(colRoleStart - spacing, pdf.y).stroke();
            pdf.moveTo(colEnd, startY - 5.2).lineTo(colEnd, pdf.y).stroke();

            let first = true;
            const oneLine = pdf.heightOfString("X", { width: colIDWidth });

            rows.forEach(row => {
                // Formatowanie roli
                function formatRole(role) {
                    if (!role) return "-";
                    if (role === "admin") return "Administrator";
                    if (role === "user") return "Użytkownik";
                    return String(role);
                }

                const safeFirst = row.first_name ? String(row.first_name) : "-";
                const safeLast = row.last_name ? String(row.last_name) : "-";
                const safeEmail = row.email ? String(row.email) : "-";
                const safeRole = formatRole(row.role)

                pdf.moveDown(0.3);

                let rowY = pdf.y;
                let rowStartY = pdf.y;

                const hID = pdf.heightOfString(String(row.id), { width: colIDWidth })
                const hFirst = pdf.heightOfString(safeFirst, { width: colFirstWidth })
                const hLast = pdf.heightOfString(safeLast, { width: colLastWidth })
                const hEmail = pdf.heightOfString(safeEmail, { width: colEmailWidth })
                const hRole = pdf.heightOfString(safeRole, { width: colRoleWidth })

                const rowHeight = Math.max(hID, hFirst, hLast, hEmail, hRole)

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
                pdf.text(safeFirst, colFirstStart, rowY, { width: colFirstWidth });
                pdf.text(safeLast, colLastStart, rowY, { width: colLastWidth });
                pdf.text(safeEmail, colEmailStart, rowY, { width: colEmailWidth });
                pdf.text(safeRole, colRoleStart, rowY, { width: colRoleWidth });
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
                pdf.moveTo(colFirstStart - spacing, rowY - 3.85).lineTo(colFirstStart - spacing, pdf.y).stroke();
                pdf.moveTo(colLastStart - spacing, rowY - 3.85).lineTo(colLastStart - spacing, pdf.y).stroke();
                pdf.moveTo(colEmailStart - spacing, rowY - 3.85).lineTo(colEmailStart - spacing, pdf.y).stroke();
                pdf.moveTo(colRoleStart - spacing, rowY - 3.85).lineTo(colRoleStart - spacing, pdf.y).stroke();
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
                'GENERATE_REPORT_USERS', 
                'Wygenerowano raport PDF: users'
            );
        }
    );
};