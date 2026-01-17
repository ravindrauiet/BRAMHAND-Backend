const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

function log(msg) {
    const time = new Date().toISOString();
    const entry = `[${time}] ${msg}`;
    console.log(entry);
    fs.appendFileSync('migrate_log.txt', entry + '\n');
}

fs.writeFileSync('migrate_log.txt', 'Starting Migrate v2 (Compat Mode)...\n');

async function migrate() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        log(`Connecting to ${config.database}...`);
        const connection = await mysql.createConnection(config);
        log('Connected.');

        const queries = [
            "ALTER TABLE videos ADD COLUMN content_rating VARCHAR(10) DEFAULT 'U/A 13+'",
            "ALTER TABLE videos ADD COLUMN release_date DATE",
            "ALTER TABLE videos ADD COLUMN duration INT DEFAULT 0",
            "ALTER TABLE videos ADD COLUMN language VARCHAR(50) DEFAULT 'Maithili'",
            "ALTER TABLE videos ADD COLUMN views_count INT DEFAULT 0",
            "ALTER TABLE videos ADD COLUMN likes_count INT DEFAULT 0",
            "ALTER TABLE videos ADD COLUMN shares_count INT DEFAULT 0",
            "ALTER TABLE videos ADD COLUMN tags TEXT",
            "ALTER TABLE videos ADD COLUMN season_number INT DEFAULT NULL",
            "ALTER TABLE videos ADD COLUMN episode_number INT DEFAULT NULL"
        ];

        for (const query of queries) {
            try {
                await connection.query(query);
                log(`Executed: ${query}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    log(`Column already exists (Ignored): ${query}`);
                } else {
                    log(`Error: ${e.message} (Query: ${query})`);
                }
            }
        }

        log('Schema updated successfully.');
        await connection.end();
        process.exit(0);

    } catch (error) {
        log('Migration failed: ' + error.message);
        process.exit(1);
    }
}

migrate();
