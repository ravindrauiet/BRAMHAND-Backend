const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function check() {
    let log = 'Verifying DB Content...\n';
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        const conn = await mysql.createConnection(config);

        // Check Songs Details
        const [songs] = await conn.query('SELECT id, title, is_trending, is_active FROM songs');
        log += '--- SONGS ---\n';
        log += JSON.stringify(songs, null, 2) + '\n';

        // Check Playlists Details
        const [playlists] = await conn.query('SELECT id, name, is_public FROM playlists');
        log += '--- PLAYLISTS ---\n';
        log += JSON.stringify(playlists, null, 2) + '\n';

        // Check Genres
        const [genres] = await conn.query('SELECT id, name, is_active FROM music_genres');
        log += '--- GENRES ---\n';
        log += JSON.stringify(genres, null, 2) + '\n';

        await conn.end();
        fs.writeFileSync('db_verification.txt', log);
    } catch (e) {
        fs.writeFileSync('db_verification.txt', 'Error: ' + e.message);
    }
}

check();
