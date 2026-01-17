require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function check() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.query('SELECT COUNT(*) as count FROM videos');
        const [active] = await connection.query('SELECT COUNT(*) as count FROM videos WHERE is_active = 1');
        const [sample] = await connection.query('SELECT title, is_active FROM videos LIMIT 3');

        const output = `
TIMESTAMP: ${new Date().toISOString()}
TOTAL VIDEOS: ${rows[0].count}
ACTIVE VIDEOS: ${active[0].count}
SAMPLE DATA:
${JSON.stringify(sample, null, 2)}
        `;

        fs.writeFileSync('db_verification.txt', output);
        await connection.end();
        process.exit(0);
    } catch (e) {
        fs.writeFileSync('db_verification.txt', 'ERROR: ' + e.toString());
        process.exit(1);
    }
}
check();
