const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkTables() {
    const resultPath = path.join(__dirname, 'tables_check_result.txt');
    try {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };

        const connection = await mysql.createConnection(config);
        const [rows] = await connection.query('SHOW TABLES;');

        let output = `Database: ${config.database}\nTables found (${rows.length}):\n`;
        if (rows.length === 0) {
            output += '(No tables found)';
        } else {
            rows.forEach(row => {
                output += `- ${Object.values(row)[0]}\n`;
            });
        }

        fs.writeFileSync(resultPath, output);
        await connection.end();
    } catch (error) {
        fs.writeFileSync(resultPath, 'Error: ' + error.message);
    }
}

checkTables();
