const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAudioUrls() {
    console.log('=== Updating Audio URLs ===');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    console.log('Connecting to:', config.host, config.database);

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected!');

        // Free audio samples from Pixabay that work with web browsers (CORS enabled)
        const audioUrls = [
            'https://cdn.pixabay.com/audio/2024/11/06/audio_3cf9ec0d6c.mp3',
            'https://cdn.pixabay.com/audio/2024/09/26/audio_c91b23e6e6.mp3',
            'https://cdn.pixabay.com/audio/2024/10/13/audio_b5c02dc5dc.mp3',
            'https://cdn.pixabay.com/audio/2024/11/15/audio_ad56f2e631.mp3',
            'https://cdn.pixabay.com/audio/2024/09/12/audio_6cd6e0b4c3.mp3',
            'https://cdn.pixabay.com/audio/2024/08/20/audio_acf15f52dd.mp3',
            'https://cdn.pixabay.com/audio/2024/07/31/audio_f52d7ea7d8.mp3',
            'https://cdn.pixabay.com/audio/2024/06/12/audio_6eb09d7e6c.mp3',
        ];

        // Get all songs
        const [songs] = await connection.query('SELECT id, title FROM songs');
        console.log(`Found ${songs.length} songs`);

        if (songs.length === 0) {
            console.log('No songs found. Inserting sample songs...');

            const sampleSongs = [
                { title: 'Mithila Beats Vol. 2', artist: 'Various Artists', duration: 225, is_trending: true, is_featured: true },
                { title: 'Sita\'s Song', artist: 'Priya Mallick', duration: 252, is_trending: true, is_featured: false },
                { title: 'Rivers of Tirhut', artist: 'The Fusion Project', duration: 198, is_trending: true, is_featured: true },
                { title: 'Mithila Ke Beti', artist: 'Anjali Bharti', duration: 280, is_trending: true, is_featured: false },
                { title: 'Ganga Maiya', artist: 'Udit Narayan', duration: 245, is_trending: true, is_featured: true },
                { title: 'Vivah Geet', artist: 'Sharda Sinha', duration: 312, is_trending: true, is_featured: false },
                { title: 'Sita Ram', artist: 'Maithili Thakur', duration: 301, is_trending: true, is_featured: true },
                { title: 'Mithila Varnan', artist: 'Kunj Bihari', duration: 202, is_trending: true, is_featured: false },
            ];

            for (let i = 0; i < sampleSongs.length; i++) {
                const s = sampleSongs[i];
                const audioUrl = audioUrls[i % audioUrls.length];
                await connection.query(
                    `INSERT INTO songs (title, artist, audio_url, duration, is_trending, is_featured, is_active, genre_id) 
                     VALUES (?, ?, ?, ?, ?, ?, true, 1)`,
                    [s.title, s.artist, audioUrl, s.duration, s.is_trending, s.is_featured]
                );
                console.log(`Inserted: ${s.title}`);
            }
        } else {
            // Update existing songs with new audio URLs
            for (let i = 0; i < songs.length; i++) {
                const song = songs[i];
                const audioUrl = audioUrls[i % audioUrls.length];
                await connection.query(
                    'UPDATE songs SET audio_url = ?, is_active = true, is_trending = true WHERE id = ?',
                    [audioUrl, song.id]
                );
                console.log(`Updated: ${song.title} -> ${audioUrl.substring(0, 50)}...`);
            }
        }

        console.log('Done! All songs now have working audio URLs.');
        await connection.end();
        process.exit(0);

    } catch (e) {
        console.error('Error:', e.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

updateAudioUrls();
