const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log("Connected to DB via DATABASE_URL.");

        const [rows] = await connection.execute("SELECT id, series_id FROM videos WHERE series_id IS NOT NULL AND series_id != 0");

        if (rows.length > 0) {
            console.log(`WARNING: Found ${rows.length} videos with series_id set.`);
            console.log(JSON.stringify(rows));
            console.log("These will cause foreign key errors when linking to empty Series table.");
        } else {
            console.log("SUCCESS: No orphaned series_id values found. Safe to migrate.");
        }

        await connection.end();
    } catch (e) {
        console.error("Check failed:", e.message);
    }
}
check();
