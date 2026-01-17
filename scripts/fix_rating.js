const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

function log(msg) {
    fs.appendFileSync('fix_log.txt', msg + '\n');
    console.log(msg);
}

fs.writeFileSync('fix_log.txt', 'Starting Fix Rating...\n');

async function fix() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        log('Connecting...');
        const connection = await mysql.createConnection(config);
        log('Connected. Fixing content_rating...');

        await connection.query("ALTER TABLE videos MODIFY COLUMN content_rating VARCHAR(20) DEFAULT 'U/A 13+'");
        log('content_rating expanded to VARCHAR(20).');

        await connection.end();
        process.exit(0);
    } catch (e) {
        log('Error: ' + e.message);
        process.exit(1);
    }
}
fix();
