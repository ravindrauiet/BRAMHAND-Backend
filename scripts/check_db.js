const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkDb() {
    const resultPath = path.join(__dirname, 'db_check_result.txt');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        const [rows] = await connection.query('SHOW DATABASES;');
        const dbs = rows.map(r => r.Database);

        fs.writeFileSync(resultPath, 'Databases found:\n' + dbs.join('\n'));
        await connection.end();
    } catch (error) {
        fs.writeFileSync(resultPath, 'Error: ' + error.message);
    }
}

checkDb();
