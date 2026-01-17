const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        const [rows] = await connection.execute("SHOW COLUMNS FROM video_views");
        console.log("Columns in video_views:", rows.map(r => r.Field));
        await connection.end();
    } catch (e) {
        console.error("Error checking columns:", e);
    }
}
check();
