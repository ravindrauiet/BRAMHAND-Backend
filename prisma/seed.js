const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupMusic() {
    console.log('=== Complete Music Setup ===\n');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    console.log('Connecting to:', config.database, '@', config.host);

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected!\n');

        // Step 1: Add lyrics column if it doesn't exist
        console.log('Step 1: Adding lyrics column...');
        try {
            await connection.query('ALTER TABLE songs ADD COLUMN lyrics TEXT');
            console.log('  Lyrics column added.\n');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('  Lyrics column already exists.\n');
            } else {
                console.log('  Note:', e.message, '\n');
            }
        }

        // Step 2: Insert/Update genres
        console.log('Step 2: Setting up genres...');
        const genres = ['Folk', 'Pop', 'Classical', 'Devotional', 'Contemporary', 'Modern Folk'];
        let genreMap = {};
        for (const g of genres) {
            await connection.query(`INSERT IGNORE INTO music_genres (name, is_active) VALUES (?, true)`, [g]);
            const [rows] = await connection.query('SELECT id FROM music_genres WHERE name = ?', [g]);
            if (rows.length) genreMap[g] = rows[0].id;
        }
        console.log('  Genres ready.\n');

        // Step 3: Insert songs with working audio URLs and lyrics
        console.log('Step 3: Inserting songs with audio and lyrics...');

        // USER PROVIDED AUDIO URLs + ORIGINAL REALISTIC IMAGES
        const songs = [
            {
                title: 'Mithila Beats Vol. 2',
                artist: 'Various Artists',
                genre: 'Pop',
                duration: 180,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2022/06/Infraction-Tech-Success-pr.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHsZZKHGzdHYf1I-hIKNtmrZNuF1533Tx7n-CyiKUjTKD82ZfzjxO3ZoTZlTXS8NkR9s55R7etkNyfMjpvw4O3f8btzAv2YodxAVm48R_lAszoLEXTxEeg7VNnJniqg7CFN_zVapYqAsHN-tfvT6S4PWYq2r3NssK_gOlkUPGVDG5HxRU4pNiNU7g7_vbOdFeHIttRjaawXc5raXD3YT3JqHtmuMQZmWRt8Rmnjqm4WcxbJT5f0WQcelpZVc8DfcewI8a9HaoFKQw',
                lyrics: `मिथिला के धुन में झूमे सब जन
गाओ गीत मिथिला के
नाचो ताल पर सब मिल के

मिथिला की माटी में है जादू
यहाँ के गीतों में है प्यार`,
                isTrending: true,
                isFeatured: true
            },
            {
                title: "Sita's Song",
                artist: 'Priya Mallick',
                genre: 'Devotional',
                duration: 210,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2025/12/MokkaMusic-Surface-watermark.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY_sEzScwhd6AmlWt-YkD0DxzKougGHU55MvLJOY1uGn-a96j9UuM6CXdhCLmmDUKeud2zu90YABCS18w8iUMzOMA5aQ4P9YNrhVGnQPh3pvobXruxvVWrwHszr6IryIf2TyyEVcsiX_g5nLX5Ya_yJKr328QsnEjbYQ4SpBAkRITu5m7O2R6witOse480bVFaxxOugUSdWl9LbAzMOkpiiHjzg001KAhGTB_sMkaXN72mS2GMaOHhwtUO_3i1-CRm00oSfDzik_0',
                lyrics: `सीता माता की महिमा अपार
जनकपुर की राजकुमारी
राम की प्रिय पटरानी

धरती से जन्मी थी माता
पवित्रता की मूरत थी वो`,
                isTrending: true,
                isFeatured: false
            },
            {
                title: 'Rivers of Tirhut',
                artist: 'The Fusion Project',
                genre: 'Modern Folk',
                duration: 195,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2025/09/unfeel-Survival.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPnto3eZQu7locjc-fAei3ZvL9-VQ-ynh1PF8IC5MNyApAx7Z3Pv9UDHeAkAzthVzP1MsRe4utA2Ru47M3ovbTZbqCkDwCQA2JxEVnmYJYF2lpyEoBkookSm8fireGXJ9BUm_0PSH2gUOqEh4jjhHkwzQr9DPz3KzAs7hDLBSrxq6SSCFJUa0CW6FkISXuG2shM9sFwpIPmq4uoC36wKZl7m3S4jD0xN0-U4YBSobZHGtXDGcxCmpTZi42Q-93lyuS9wluo0RIP2g',
                lyrics: `तिरहुत की नदियाँ बहती रहें
कोसी, कमला, बागमती
गंगा की धारा पवित्र है
मिथिला का गौरव अमित है`,
                isTrending: true,
                isFeatured: true
            },
            {
                title: 'Mithila Ke Beti',
                artist: 'Anjali Bharti',
                genre: 'Folk',
                duration: 240,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2025/05/MokkaMusic-We-Bloom-Apart-watermark.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAPQiMlHm5RE_2E-I0nJVbaBMYQR0gmdjMF8c0e_6iLlLWwisxKHZZDoCpxIMBCl9qlTBBuSkYrnTBMExXGXFitNjjli8zrMyJzkLeN5vFce2FAfLZ7Nz5nON_-IrKLJbCq98rjU4HfOyJzh-bggjPs4TZ_-u6LOITXATggfdotDNLJAl3ANiXI4Fw6AtuxuQ20M_66CIERqCqUbtB2wFiTqCLF75n8-jWReSNMdS01mQMGnkIZtRI5BZkJWoVc0tlhE2I2SBHERg',
                lyrics: `मिथिला के बेटी हम सब
गौरव है हमारा अपना
संस्कार और सभ्यता में
कोई हमसे न बढ़ सके`,
                isTrending: true,
                isFeatured: false
            },
            {
                title: 'Ganga Maiya',
                artist: 'Udit Narayan',
                genre: 'Folk',
                duration: 185,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2024/12/MokkaMusic-Lost-in-Thought-watermark.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAodKyOVKhd_sVUQdW0P5oM--Li2ECxhvwcryB9tp8WaZftlvnt787AxelmaipEYFQ7ZVjvWSp1mndFHkq1f2WEam9TuOwxei7j5mqVDClz4QTZcVDT_O8ibtCH_0jI08v3yMjg3etDQumdZChFTOUBmHtYcKUm6zQGeFCIWOdokFqnfkgfPV0Irb9Abhsz1C5qs3vZT8e4I2C2YYTEHKEQyd1P5MAJ1e7maltAuqpEeT-I0SMbHr_-HiyVDR9XAxdFpyqiyvKJpfY',
                lyrics: `गंगा मैया की जय हो
पावन धारा में नहाओ
पाप धुल जाएं सारे
मोक्ष का मार्ग पाओ`,
                isTrending: true,
                isFeatured: true
            },
            {
                title: 'Vivah Geet',
                artist: 'Sharda Sinha',
                genre: 'Folk',
                duration: 180,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2022/06/Infraction-Tech-Success-pr.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnqnxaepxbaxgWR0as3h-UnxcsnGzlI0HCCYhfJ0rJpDw3CmWjVIMtc8ih41fU1JmVdepKXyDERV7Vou35Aln7myoZfsGS6xTUXMneJq_vvxJlPKj0SlLX0-4yWhTc9cqfNNs48zNoNy4zGuK-vhLHCiDSH5jtcDaJn2dbsNsx5FIKJUdOM3N2IJhLTlj17-VckF7o37Sp6-I0huyJkl-rhUSCH9ncS0OtXbHMKnb7O5IvIBWB6uy1Rfd8m_bkT77nZOXz3OVxWDc',
                lyrics: ` कन्यादान का समय आ गया
बाबुल की लाडली जा रही है
नई ज़िंदगी की शुरुआत है
सबकी दुआएं साथ हैं`,
                isTrending: true,
                isFeatured: false
            },
            {
                title: 'Sita Ram',
                artist: 'Maithili Thakur',
                genre: 'Devotional',
                duration: 210,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2025/12/MokkaMusic-Surface-watermark.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAPQiMlHm5RE_2E-I0nJVbaBMYQR0gmdjMF8c0e_6iLlLWwisxKHZZDoCpxIMBCl9qlTBBuSkYrnTBMExXGXFitNjjli8zrMyJzkLeN5vFce2FAfLZ7Nz5nON_-IrKLJbCq98rjU4HfOyJzh-bggjPs4TZ_-u6LOITXATggfdotDNLJAl3ANiXI4Fw6AtuxuQ20M_66CIERqCqUbtB2wFiTqCLF75n8-jWReSNMdS01mQMGnkIZtRI5BZkJWoVc0tlhE2I2SBHERg',
                lyrics: `सीता राम सीता राम
सीता राम कहिए
जाहि विधि राखे राम
ताहि विधि रहिए`,
                isTrending: true,
                isFeatured: true
            },
            {
                title: 'Mithila Varnan',
                artist: 'Kunj Bihari',
                genre: 'Classical',
                duration: 195,
                audioUrl: 'https://inaudio.org/wp-content/uploads/2025/09/unfeel-Survival.mp3',
                coverImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtdrwXyVPuo0z_6mHCFK2LP7EJbD51grWGZtXql7ojlYYPZ5MHYuCY7QMcqxNaDtUAyUZHSYe4w2nSmnqcJtMIy4nHKLjEmVM4XEUkeTeCLyDcXO440eeJNcxT3L0ceCQfL9k9hqMi4exvkiX27AgViVD6AioitqvKm1789VQfQ20mXRzq36K0DTVOP_ULMGGkNH1fYB0XKfbmqjxqS0Cn-gbqz_T9x0yDNG2SyT1-V2AJ1JNG7m_J2coZ4nmlfUhc3tXyjIoiqdQ',
                lyrics: `मिथिला की महिमा अपार है
विदेह राज की नगरी है
जनक पुरी की शान है
यहाँ संस्कृति महान है`,
                isTrending: true,
                isFeatured: false
            }
        ];

        // Delete existing songs and insert fresh
        await connection.query('DELETE FROM playlist_songs');
        await connection.query('DELETE FROM song_likes');
        await connection.query('DELETE FROM songs');
        console.log('  Cleared old songs.');

        const songIds = [];
        for (const s of songs) {
            const genreId = genreMap[s.genre] || 1;
            const [result] = await connection.query(
                `INSERT INTO songs (title, artist, genre_id, audio_url, cover_image_url, lyrics, duration, is_trending, is_featured, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
                [s.title, s.artist, genreId, s.audioUrl, s.coverImageUrl, s.lyrics, s.duration, s.isTrending, s.isFeatured]
            );
            songIds.push(result.insertId);
            console.log(`  Added: ${s.title}`);
        }
        console.log(`  Total ${songIds.length} songs added.\n`);

        // Step 4: Create sample playlists
        console.log('Step 4: Creating playlists...');
        const [users] = await connection.query('SELECT id FROM users LIMIT 1');
        if (users.length > 0) {
            const ownerId = users[0].id;

            await connection.query('DELETE FROM playlists WHERE name IN (?, ?, ?)',
                ['Top Mithila Hits', 'Devotional Collection', 'Folk Favorites']);

            const playlists = [
                { name: 'Top Mithila Hits', desc: 'Best songs from Mithila region' },
                { name: 'Devotional Collection', desc: 'Spiritual songs for peace' },
                { name: 'Folk Favorites', desc: 'Traditional folk music' }
            ];

            for (const p of playlists) {
                const [pRes] = await connection.query(
                    'INSERT INTO playlists (user_id, name, description, is_public, cover_image_url) VALUES (?, ?, ?, true, ?)',
                    [ownerId, p.name, p.desc, 'https://placehold.co/400x400/3F51B5/FFFFFF/png?text=' + encodeURIComponent(p.name)]
                );
                const playlistId = pRes.insertId;

                // Add songs to playlist
                for (const songId of songIds) {
                    await connection.query('INSERT IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)',
                        [playlistId, songId]);
                }
                console.log(`  Created: ${p.name}`);
            }
        }
        console.log('');

        // Verify
        console.log('=== Verification ===');
        const [songCount] = await connection.query('SELECT COUNT(*) as cnt FROM songs');
        const [playlistCount] = await connection.query('SELECT COUNT(*) as cnt FROM playlists');
        console.log(`Songs in database: ${songCount[0].cnt}`);
        console.log(`Playlists in database: ${playlistCount[0].cnt}`);

        // Show sample song
        const [sample] = await connection.query('SELECT title, artist, audio_url, duration FROM songs LIMIT 1');
        if (sample.length) {
            console.log(`\nSample song: "${sample[0].title}" by ${sample[0].artist}`);
            console.log(`Audio URL: ${sample[0].audio_url}`);
            console.log(`Duration: ${sample[0].duration}s`);
        }

        console.log('\n=== Setup Complete! ===');
        console.log('Now restart your Flutter app and the music should play!');

        await connection.end();
        process.exit(0);

    } catch (e) {
        console.error('Error:', e.message);
        console.error(e.stack);
        if (connection) await connection.end();
        process.exit(1);
    }
}

setupMusic();
