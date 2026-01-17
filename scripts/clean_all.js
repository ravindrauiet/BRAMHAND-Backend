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
        console.log('Truncating videos table...');

        // Disable foreign key checks to allow truncation
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query("TRUNCATE TABLE videos");
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Videos table truncated.');
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
clean();
