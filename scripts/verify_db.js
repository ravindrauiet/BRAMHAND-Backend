const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    try {
        const connection = await mysql.createConnection({
             host: process.env.DB_HOST || 'localhost',
             user: process.env.DB_USER,
             password: process.env.DB_PASSWORD,
             database: process.env.DB_NAME
        });
        console.log("Connected to DB!");
        
        const [rows] = await connection.query("SELECT count(*) as count FROM videos");
        console.log("Video count:", rows[0].count);

        const [sample] = await connection.query("SELECT title, type FROM videos LIMIT 3");
        console.log("Sample videos:", sample);

        await connection.end();
    } catch (e) {
        console.error("DB Connection/Query Error:", e.message);
    }
}

checkData();
