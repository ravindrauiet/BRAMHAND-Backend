const mysql = require('mysql2/promise');
require('dotenv').config();

async function clean() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to cleanup.');

        // Delete old/standalone versions to allow fresh seed of Series+Episodes
        await connection.query("DELETE FROM videos WHERE title LIKE 'Mithila Ke Angana%'");
        await connection.query("DELETE FROM videos WHERE title IN ('The Return', 'Old Recipes', 'The Competition')");

        console.log('Deleted old video entries.');
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
clean();
