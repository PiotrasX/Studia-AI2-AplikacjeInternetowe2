// Import bibliotek
const fs = require('fs');
const path = require('path');
const db = require('../db/database');

// Zapis do pliku
function logToFile(message) {
    const logPath = path.join(__dirname, '..', 'logs', 'actions.log');
    const entry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logPath, entry);
}

// Zapis do bazy SQLite
function logToDatabase(userId, action, details) {
    const sql = `
        INSERT INTO logs (user_id, action, details, timestamp)
        VALUES (?, ?, ?, datetime('now'))
    `;
    db.run(sql, [userId, action, details]);
}

// Główna funkcja do pisania logów
function logAction(user, action, details = '') {
    const username = user?.email || 'UNKNOWN';
    const userId = user?.id || null;

    const message = `USER: ${username} | ACTION: ${action} | DETAILS: ${details}`;

    logToFile(message);
    logToDatabase(userId, action, details);
}

module.exports = { logAction };