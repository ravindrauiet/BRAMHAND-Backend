const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function checkDb() {
    const logFile = 'db_status_report.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    fs.writeFileSync(logFile, '=== Database Verification Report ===\n');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    log(`Connecting to database: ${config.database}`);

    try {
        const conn = await mysql.createConnection(config);
        log('Connected successfully.');

        // 1. Check Table Structure
        log('\n--- Checking Table Structure for "songs" ---');
        const [columns] = await conn.query('SHOW COLUMNS FROM songs');
        const hasLyrics = columns.some(c => c.Field === 'lyrics');
        log(`Has 'lyrics' column: ${hasLyrics}`);
        log(`Columns found: ${columns.map(c => c.Field).join(', ')}`);

        // 2. Check Songs Data
        log('\n--- Checking Songs Data ---');
        const [songs] = await conn.query('SELECT id, title, artist, audio_url, lyrics, duration FROM songs LIMIT 5');
        log(`Total songs found: ${songs.length}`);

        songs.forEach(s => {
            log(`\nSong ID: ${s.id}`);
            log(`Title: ${s.title}`);
            log(`Audio URL: ${s.audio_url}`);
            log(`Duration: ${s.duration}`);
            log(`Has Lyrics: ${!!s.lyrics && s.lyrics.length > 0} (Length: ${s.lyrics ? s.lyrics.length : 0})`);
            if (s.lyrics) {
                log(`Sample Lyrics: ${s.lyrics.substring(0, 50).replace(/\n/g, ' ')}...`);
            }
        });

        if (songs.length === 0) {
            log('\nWARNING: No songs found in the database!');
        } else if (!hasLyrics) {
            log('\nWARNING: Lyrics column is missing!');
        } else {
            log('\nSUCCESS: Database seems to correspond to expectations if songs are present.');
        }

        await conn.end();
    } catch (e) {
        log(`\nERROR: ${e.message}`);
    }
}

checkDb();
