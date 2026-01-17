require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    console.log('Starting check...');
    console.log('DB Config:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME
        // pass not shown
    });

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected!');

        const [rows] = await connection.query('SELECT COUNT(*) as count FROM videos');
        console.log('Total Videos:', rows[0].count);

        const [active] = await connection.query('SELECT COUNT(*) as count FROM videos WHERE is_active = 1');
        console.log('Active Videos:', active[0].count);

        await connection.end();
        process.exit(0);
    } catch (e) {
        console.error('Connection Failed:', e);
        process.exit(1);
    }
}

check();
