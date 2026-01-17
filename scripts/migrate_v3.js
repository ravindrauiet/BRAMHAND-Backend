const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

function log(msg) {
    const time = new Date().toISOString();
    const entry = `[${time}] ${msg}`;
    console.log(entry);
    fs.appendFileSync('migrate_log.txt', entry + '\n');
}

async function migrate() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        log(`Connecting to ${config.database} for V3...`);
        const connection = await mysql.createConnection(config);
        log('Connected.');

        const queries = [
            // 1. Add Series grouping and Technical Specs to videos
            "ALTER TABLE videos ADD COLUMN series_id INT DEFAULT NULL",
            "ALTER TABLE videos ADD COLUMN quality_tags VARCHAR(50) DEFAULT 'HD'",
            "ALTER TABLE videos ADD COLUMN audio_languages VARCHAR(50) DEFAULT 'Maithili'",
            "ALTER TABLE videos ADD COLUMN is_active BOOLEAN DEFAULT TRUE"
        ];

        for (const query of queries) {
            try {
                await connection.query(query);
                log(`Executed: ${query}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    log(`Column already exists (Ignored): ${query}`);
                } else {
                    log(`Error: ${e.message}`);
                }
            }
        }

        // Create table (CREATE TABLE IF NOT EXISTS is valid in standard MySQL usually, checking version support)
        // If versions < 5.7 support it, we are good. 
        // Most MySQL versions support CREATE TABLE IF NOT EXISTS.
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS watch_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    video_id INT NOT NULL,
                    progress_seconds INT DEFAULT 0,
                    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    is_completed BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
                )
            `);
            log('Created watch_history table.');
        } catch (e) {
            log('Error creating watch_history: ' + e.message);
        }

        log('Migration V3 completed.');
        await connection.end();
        process.exit(0);

    } catch (error) {
        log('Migration V3 failed: ' + error.message);
        process.exit(1);
    }
}

migrate();
