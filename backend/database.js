const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'data.db');
const db = new Database(dbPath);

function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            current_level TEXT DEFAULT 'A2',
            streak INTEGER DEFAULT 0,
            tokens_used INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            original_text TEXT,
            submitted_text TEXT,
            status TEXT,
            overall_feedback TEXT,
            grammar_analysis TEXT,
            vocabulary_correction TEXT,
            native_refactoring TEXT,
            key_takeaway TEXT,
            next_instruction TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Users will be created via CLI

    // Migration for existing databases
    try {
        db.prepare("ALTER TABLE users ADD COLUMN tokens_used INTEGER DEFAULT 0").run();
    } catch (err) {}
    try { db.prepare("ALTER TABLE history ADD COLUMN overall_feedback TEXT").run(); } catch (err) {}
    try { db.prepare("ALTER TABLE history ADD COLUMN key_takeaway TEXT").run();
    } catch (err) {
        // Column probably already exists, ignore
    }
}

module.exports = {
    db,
    initDb
};
