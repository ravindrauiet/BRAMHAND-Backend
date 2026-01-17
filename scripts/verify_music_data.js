const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    console.log('Verifying Music Data...');
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        const conn = await mysql.createConnection(config);

        // Check Songs
        const [songs] = await conn.query('SELECT COUNT(*) as count FROM songs');
        console.log(`Songs Count: ${songs[0].count}`);

        // Check Playlists
        const [playlists] = await conn.query('SELECT COUNT(*) as count FROM playlists');
        console.log(`Playlists Count: ${playlists[0].count}`);

        // Check Artists (CreatorProfiles)
        const [creators] = await conn.query('SELECT COUNT(*) as count FROM creator_profiles');
        console.log(`Creators Count: ${creators[0].count}`);

        // Check specific Artist
        const [udit] = await conn.query("SELECT * FROM users WHERE email LIKE 'udit%'");
        if (udit.length) console.log(`Found Udit: ${udit[0].full_name}`);
        else console.log('Udit NOT found');

        await conn.end();
    } catch (e) {
        console.error(e);
    }
}

check();
