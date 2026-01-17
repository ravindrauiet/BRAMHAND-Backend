const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        console.log('Connected to MySQL server.');

        await connection.query('CREATE DATABASE IF NOT EXISTS video_streaming_db;');
        console.log('Database video_streaming_db created or already exists.');

        await connection.end();
    } catch (error) {
        console.error('Error creating database:', error);
    }
}

createDb();
