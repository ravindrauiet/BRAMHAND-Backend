const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const LOG_FILE = 'audit_result.log';

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
}

async function audit() {
    try {
        fs.writeFileSync(LOG_FILE, '', 'utf8'); // Clear log

        log("=== Database Audit ===");

        const config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'tirhuta_db'
        };

        log(`Connecting to database: ${config.database} on ${config.host}`);

        const connection = await mysql.createConnection(config);
        log("Connected to DB.");

        // List Tables
        const [tables] = await connection.execute("SHOW TABLES");
        const tableNames = tables.map(row => Object.values(row)[0]);
        log("Tables found: " + JSON.stringify(tableNames));

        // Check for 'series' table
        if (tableNames.includes('series')) {
            log("SUCCESS: 'series' table exists.");
            const [columns] = await connection.execute("SHOW COLUMNS FROM series");
            log("Columns in 'series': " + JSON.stringify(columns.map(c => c.Field)));
        } else {
            log("ERROR: 'series' table matches NOT found in DB tables.");
        }

        // Check 'videos' table for series_id
        if (tableNames.includes('videos')) {
            const [columns] = await connection.execute("SHOW COLUMNS FROM videos");
            const fields = columns.map(c => c.Field);
            log("Columns in 'videos': " + JSON.stringify(fields));
            if (fields.includes('series_id')) {
                log("INFO: 'videos' table has 'series_id' column.");
            } else {
                log("WARNING: 'videos' table missing 'series_id' column.");
            }
        }

        await connection.end();
    } catch (e) {
        log("Audit failed: " + e.message);
        process.exit(1);
    }
}
audit();
