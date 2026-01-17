const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedMusic() {
    console.log('Starting Music Seed...');
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to DB.');

        // 1. Artists (Creates Users + CreatorProfiles)
        const artists = [
            { name: 'Udit Narayan', role: 'Playback Singer', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAodKyOVKhd_sVUQdW0P5oM--Li2ECxhvwcryB9tp8WaZftlvnt787AxelmaipEYFQ7ZVjvWSp1mndFHkq1f2WEam9TuOwxei7j5mqVDClz4QTZcVDT_O8ibtCH_0jI08v3yMjg3etDQumdZChFTOUBmHtYcKUm6zQGeFCIWOdokFqnfkgfPV0Irb9Abhsz1C5qs3vZT8e4I2C2YYTEHKEQyd1P5MAJ1e7maltAuqpEeT-I0SMbHr_-HiyVDR9XAxdFpyqiyvKJpfY' },
            { name: 'Sharda Sinha', role: 'Mithila Folk', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnqnxaepxbaxgWR0as3h-UnxcsnGzlI0HCCYhfJ0rJpDw3CmWjVIMtc8ih41fU1JmVdepKXyDERV7Vou35Aln7myoZfsGS6xTUXMneJq_vvxJlPKj0SlLX0-4yWhTc9cqfNNs48zNoNy4zGuK-vhLHCiDSH5jtcDaJn2dbsNsx5FIKJUdOM3N2IJhLTlj17-VckF7o37Sp6-I0huyJkl-rhUSCH9ncS0OtXbHMKnb7O5IvIBWB6uy1Rfd8m_bkT77nZOXz3OVxWDc' },
            { name: 'Maithili Thakur', role: 'Classical Pop', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAPQiMlHm5RE_2E-I0nJVbaBMYQR0gmdjMF8c0e_6iLlLWwisxKHZZDoCpxIMBCl9qlTBBuSkYrnTBMExXGXFitNjjli8zrMyJzkLeN5vFce2FAfLZ7Nz5nON_-IrKLJbCq98rjU4HfOyJzh-bggjPs4TZ_-u6LOITXATggfdotDNLJAl3ANiXI4Fw6AtuxuQ20M_66CIERqCqUbtB2wFiTqCLF75n8-jWReSNMdS01mQMGnkIZtRI5BZkJWoVc0tlhE2I2SBHERg' },
            { name: 'Kunj Bihari', role: 'Classical', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtdrwXyVPuo0z_6mHCFK2LP7EJbD51grWGZtXql7ojlYYPZ5MHYuCY7QMcqxNaDtUAyUZHSYe4w2nSmnqcJtMIy4nHKLjEmVM4XEUkeTeCLyDcXO440eeJNcxT3L0ceCQfL9k9hqMi4exvkiX27AgViVD6AioitqvKm1789VQfQ20mXRzq36K0DTVOP_ULMGGkNH1fYB0XKfbmqjxqS0Cn-gbqz_T9x0yDNG2SyT1-V2AJ1JNG7m_J2coZ4nmlfUhc3tXyjIoiqdQ' },
            { name: 'Priya Mallick', role: 'Devotional', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY_sEzScwhd6AmlWt-YkD0DxzKougGHU55MvLJOY1uGn-a96j9UuM6CXdhCLmmDUKeud2zu90YABCS18w8iUMzOMA5aQ4P9YNrhVGnQPh3pvobXruxvVWrwHszr6IryIf2TyyEVcsiX_g5nLX5Ya_yJKr328QsnEjbYQ4SpBAkRITu5m7O2R6witOse480bVFaxxOugUSdWl9LbAzMOkpiiHjzg001KAhGTB_sMkaXN72mS2GMaOHhwtUO_3i1-CRm00oSfDzik_0' },
            { name: 'Anjali Bharti', role: 'Contemporary', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAodKyOVKhd_sVUQdW0P5oM--Li2ECxhvwcryB9tp8WaZftlvnt787AxelmaipEYFQ7ZVjvWSp1mndFHkq1f2WEam9TuOwxei7j5mqVDClz4QTZcVDT_O8ibtCH_0jI08v3yMjg3etDQumdZChFTOUBmHtYcKUm6zQGeFCIWOdokFqnfkgfPV0Irb9Abhsz1C5qs3vZT8e4I2C2YYTEHKEQyd1P5MAJ1e7maltAuqpEeT-I0SMbHr_-HiyVDR9XAxdFpyqiyvKJpfY' },
            { name: 'The Fusion Project', role: 'Modern Folk', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPnto3eZQu7locjc-fAei3ZvL9-VQ-ynh1PF8IC5MNyApAx7Z3Pv9UDHeAkAzthVzP1MsRe4utA2Ru47M3ovbTZbqCkDwCQA2JxEVnmYJYF2lpyEoBkookSm8fireGXJ9BUm_0PSH2gUOqEh4jjhHkwzQr9DPz3KzAs7hDLBSrxq6SSCFJUa0CW6FkISXuG2shM9sFwpIPmq4uoC36wKZl7m3S4jD0xN0-U4YBSobZHGtXDGcxCmpTZi42Q-93lyuS9wluo0RIP2g' },
            { name: 'Vikas Jha', role: 'Poetry', img: '' }
        ];

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        console.log('Seeding Artists...');
        for (const artist of artists) {
            const email = `${artist.name.toLowerCase().replace(/\s/g, '')}@tirhuta.com`;
            const [exists] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);

            let userId;
            if (exists.length === 0) {
                const [res] = await connection.query(
                    'INSERT INTO users (full_name, email, password_hash, is_creator, is_verified) VALUES (?, ?, ?, ?, ?)',
                    [artist.name, email, passwordHash, true, true]
                );
                userId = res.insertId;

                await connection.query(
                    'INSERT INTO creator_profiles (user_id, popular_name) VALUES (?, ?)',
                    [userId, artist.name]
                );

                // Hack: Store profile image in User table too
                if (artist.img) {
                    await connection.query('UPDATE users SET profile_image = ? WHERE id = ?', [artist.img, userId]);
                }
            }
        }

        // 2. Genres
        console.log('Seeding Music Genres...');
        const genres = ['Folk', 'Pop', 'Classical', 'Devotional', 'Contemporary', 'Modern Folk', 'Unknown'];
        let genreMap = {};
        for (const g of genres) {
            await connection.query(`INSERT IGNORE INTO music_genres (name) VALUES (?)`, [g]);
            const [rows] = await connection.query('SELECT id FROM music_genres WHERE name = ?', [g]);
            if (rows.length) genreMap[g] = rows[0].id;
        }

        // 3. Songs - Using free sample audio that works with web browsers
        console.log('Seeding Songs...');
        // Free audio samples from various sources that support CORS
        const audioUrls = [
            'https://cdn.pixabay.com/audio/2024/11/06/audio_3cf9ec0d6c.mp3', // Ambient piano
            'https://cdn.pixabay.com/audio/2024/09/26/audio_c91b23e6e6.mp3', // Soft music
            'https://cdn.pixabay.com/audio/2024/10/13/audio_b5c02dc5dc.mp3', // Acoustic 
            'https://cdn.pixabay.com/audio/2024/11/15/audio_ad56f2e631.mp3', // Beautiful
            'https://cdn.pixabay.com/audio/2024/09/12/audio_6cd6e0b4c3.mp3', // Calm
            'https://cdn.pixabay.com/audio/2024/08/20/audio_acf15f52dd.mp3', // Gentle
            'https://cdn.pixabay.com/audio/2024/07/31/audio_f52d7ea7d8.mp3', // Peaceful
            'https://cdn.pixabay.com/audio/2024/06/12/audio_6eb09d7e6c.mp3', // Relaxing
        ];

        const songs = [
            { title: 'Mithila Beats Vol. 2', artist: 'Various Artists', genre: 'Pop', duration: 225, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHsZZKHGzdHYf1I-hIKNtmrZNuF1533Tx7n-CyiKUjTKD82ZfzjxO3ZoTZlTXS8NkR9s55R7etkNyfMjpvw4O3f8btzAv2YodxAVm48R_lAszoLEXTxEeg7VNnJniqg7CFN_zVapYqAsHN-tfvT6S4PWYq2r3NssK_gOlkUPGVDG5HxRU4pNiNU7g7_vbOdFeHIttRjaawXc5raXD3YT3JqHtmuMQZmWRt8Rmnjqm4WcxbJT5f0WQcelpZVc8DfcewI8a9HaoFKQw', isTrending: true, isFeatured: true },
            { title: 'Sita\'s Song', artist: 'Priya Mallick', genre: 'Devotional', duration: 252, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY_sEzScwhd6AmlWt-YkD0DxzKougGHU55MvLJOY1uGn-a96j9UuM6CXdhCLmmDUKeud2zu90YABCS18w8iUMzOMA5aQ4P9YNrhVGnQPh3pvobXruxvVWrwHszr6IryIf2TyyEVcsiX_g5nLX5Ya_yJKr328QsnEjbYQ4SpBAkRITu5m7O2R6witOse480bVFaxxOugUSdWl9LbAzMOkpiiHjzg001KAhGTB_sMkaXN72mS2GMaOHhwtUO_3i1-CRm00oSfDzik_0', isTrending: true, isFeatured: false },
            { title: 'Rivers of Tirhut', artist: 'The Fusion Project', genre: 'Modern Folk', duration: 198, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPnto3eZQu7locjc-fAei3ZvL9-VQ-ynh1PF8IC5MNyApAx7Z3Pv9UDHeAkAzthVzP1MsRe4utA2Ru47M3ovbTZbqCkDwCQA2JxEVnmYJYF2lpyEoBkookSm8fireGXJ9BUm_0PSH2gUOqEh4jjhHkwzQr9DPz3KzAs7hDLBSrxq6SSCFJUa0CW6FkISXuG2shM9sFwpIPmq4uoC36wKZl7m3S4jD0xN0-U4YBSobZHGtXDGcxCmpTZi42Q-93lyuS9wluo0RIP2g', isTrending: true, isFeatured: true },
            { title: 'Mithila Ke Beti', artist: 'Anjali Bharti', genre: 'Folk', duration: 280, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAodKyOVKhd_sVUQdW0P5oM--Li2ECxhvwcryB9tp8WaZftlvnt787AxelmaipEYFQ7ZVjvWSp1mndFHkq1f2WEam9TuOwxei7j5mqVDClz4QTZcVDT_O8ibtCH_0jI08v3yMjg3etDQumdZChFTOUBmHtYcKUm6zQGeFCIWOdokFqnfkgfPV0Irb9Abhsz1C5qs3vZT8e4I2C2YYTEHKEQyd1P5MAJ1e7maltAuqpEeT-I0SMbHr_-HiyVDR9XAxdFpyqiyvKJpfY', isTrending: true, isFeatured: false },
            { title: 'Ganga Maiya', artist: 'Udit Narayan', genre: 'Folk', duration: 245, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAodKyOVKhd_sVUQdW0P5oM--Li2ECxhvwcryB9tp8WaZftlvnt787AxelmaipEYFQ7ZVjvWSp1mndFHkq1f2WEam9TuOwxei7j5mqVDClz4QTZcVDT_O8ibtCH_0jI08v3yMjg3etDQumdZChFTOUBmHtYcKUm6zQGeFCIWOdokFqnfkgfPV0Irb9Abhsz1C5qs3vZT8e4I2C2YYTEHKEQyd1P5MAJ1e7maltAuqpEeT-I0SMbHr_-HiyVDR9XAxdFpyqiyvKJpfY', isTrending: true, isFeatured: true },
            { title: 'Vivah Geet', artist: 'Sharda Sinha', genre: 'Folk', duration: 312, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnqnxaepxbaxgWR0as3h-UnxcsnGzlI0HCCYhfJ0rJpDw3CmWjVIMtc8ih41fU1JmVdepKXyDERV7Vou35Aln7myoZfsGS6xTUXMneJq_vvxJlPKj0SlLX0-4yWhTc9cqfNNs48zNoNy4zGuK-vhLHCiDSH5jtcDaJn2dbsNsx5FIKJUdOM3N2IJhLTlj17-VckF7o37Sp6-I0huyJkl-rhUSCH9ncS0OtXbHMKnb7O5IvIBWB6uy1Rfd8m_bkT77nZOXz3OVxWDc', isTrending: true, isFeatured: false },
            { title: 'Sita Ram', artist: 'Maithili Thakur', genre: 'Devotional', duration: 301, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAPQiMlHm5RE_2E-I0nJVbaBMYQR0gmdjMF8c0e_6iLlLWwisxKHZZDoCpxIMBCl9qlTBBuSkYrnTBMExXGXFitNjjli8zrMyJzkLeN5vFce2FAfLZ7Nz5nON_-IrKLJbCq98rjU4HfOyJzh-bggjPs4TZ_-u6LOITXATggfdotDNLJAl3ANiXI4Fw6AtuxuQ20M_66CIERqCqUbtB2wFiTqCLF75n8-jWReSNMdS01mQMGnkIZtRI5BZkJWoVc0tlhE2I2SBHERg', isTrending: true, isFeatured: true },
            { title: 'Mithila Varnan', artist: 'Kunj Bihari', genre: 'Classical', duration: 202, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtdrwXyVPuo0z_6mHCFK2LP7EJbD51grWGZtXql7ojlYYPZ5MHYuCY7QMcqxNaDtUAyUZHSYe4w2nSmnqcJtMIy4nHKLjEmVM4XEUkeTeCLyDcXO440eeJNcxT3L0ceCQfL9k9hqMi4exvkiX27AgViVD6AioitqvKm1789VQfQ20mXRzq36K0DTVOP_ULMGGkNH1fYB0XKfbmqjxqS0Cn-gbqz_T9x0yDNG2SyT1-V2AJ1JNG7m_J2coZ4nmlfUhc3tXyjIoiqdQ', isTrending: true, isFeatured: false },
            { title: 'Pahun', artist: 'Tirhuta Originals', genre: 'Contemporary', duration: 255, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBZSOwK9oye0yWK3q8CDaPxglj5Ww2pTgOxxTQNbfv1xs0Kl6nJvCFcILMU52Ucb6mHbHgJ8pEFd7yJ4qjY3ngAZo8E3UTOMimJCpRYgvFakkOySEVBiREQJmDDgrVk6MNTrEifydIrmUUMMRO1dPXT94LvVaWEt4f7fZiXldsUl_nrKDWF6ebaypcio2vnxJWqrBU8N7WnsgtDbtvMnHuCollg9J0osHEJqGkz0Y38hb2i0y__FkwkNQ-QCs23k3oXYXPUh3Gp7Y', isTrending: true, isFeatured: true },
            { title: 'Janakpur Dham', artist: 'Priya Mallick', genre: 'Devotional', duration: 235, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY_sEzScwhd6AmlWt-YkD0DxzKougGHU55MvLJOY1uGn-a96j9UuM6CXdhCLmmDUKeud2zu90YABCS18w8iUMzOMA5aQ4P9YNrhVGnQPh3pvobXruxvVWrwHszr6IryIf2TyyEVcsiX_g5nLX5Ya_yJKr328QsnEjbYQ4SpBAkRITu5m7O2R6witOse480bVFaxxOugUSdWl9LbAzMOkpiiHjzg001KAhGTB_sMkaXN72mS2GMaOHhwtUO_3i1-CRm00oSfDzik_0', isTrending: false, isFeatured: true },
            { title: 'Chhath Puja Special', artist: 'Sharda Sinha', genre: 'Devotional', duration: 348, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnqnxaepxbaxgWR0as3h-UnxcsnGzlI0HCCYhfJ0rJpDw3CmWjVIMtc8ih41fU1JmVdepKXyDERV7Vou35Aln7myoZfsGS6xTUXMneJq_vvxJlPKj0SlLX0-4yWhTc9cqfNNs48zNoNy4zGuK-vhLHCiDSH5jtcDaJn2dbsNsx5FIKJUdOM3N2IJhLTlj17-VckF7o37Sp6-I0huyJkl-rhUSCH9ncS0OtXbHMKnb7O5IvIBWB6uy1Rfd8m_bkT77nZOXz3OVxWDc', isTrending: true, isFeatured: true },
            { title: 'Morning Ragas', artist: 'Kunj Bihari', genre: 'Classical', duration: 420, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtdrwXyVPuo0z_6mHCFK2LP7EJbD51grWGZtXql7ojlYYPZ5MHYuCY7QMcqxNaDtUAyUZHSYe4w2nSmnqcJtMIy4nHKLjEmVM4XEUkeTeCLyDcXO440eeJNcxT3L0ceCQfL9k9hqMi4exvkiX27AgViVD6AioitqvKm1789VQfQ20mXRzq36K0DTVOP_ULMGGkNH1fYB0XKfbmqjxqS0Cn-gbqz_T9x0yDNG2SyT1-V2AJ1JNG7m_J2coZ4nmlfUhc3tXyjIoiqdQ', isTrending: false, isFeatured: false },
        ];

        let songIds = [];
        for (let i = 0; i < songs.length; i++) {
            const s = songs[i];
            const audioUrl = audioUrls[i % audioUrls.length]; // Cycle through available audio URLs
            
            // Check existence logic
            const [check] = await connection.query('SELECT id FROM songs WHERE title = ?', [s.title]);

            if (check.length === 0) {
                const [res] = await connection.query(
                    `INSERT INTO songs (title, artist, genre_id, audio_url, cover_image_url, duration, is_trending, is_featured, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [s.title, s.artist, genreMap[s.genre] || genreMap['Unknown'] || 1, audioUrl, s.img, s.duration, s.isTrending, s.isFeatured, true]
                );
                songIds.push(res.insertId);
            } else {
                // Update existing songs with new audio URLs
                await connection.query(
                    'UPDATE songs SET audio_url = ?, duration = ?, is_trending = ?, is_featured = ?, is_active = ? WHERE id = ?',
                    [audioUrl, s.duration, s.isTrending, s.isFeatured, true, check[0].id]
                );
                songIds.push(check[0].id);
            }
        }

        // 4. Playlists
        console.log('Seeding Playlists...');
        // Need a user to own playlists. Use first artist.
        const [u] = await connection.query('SELECT id FROM users LIMIT 1');
        const ownerId = u[0].id;

        const playlists = [
            { title: 'Top 50 Mithila Folk', desc: 'Updated daily', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfHOBNohgyjWvmVExiHeYHwOEradEUQisXuSYQGLQKDmZo6teleIjpetUAb7UGCJE4TuEezB8sAVjzG8BPye36HMsl5ZZmKdbF2u4XKXsvKGH_nns_gNl2ujPIDcXsB5nyMnrMReyVleTMCwqlBccmShnDnHAC4-iekOwyZnhJwI7eLsu_tG0KrkYz5BiefTtaLtOGIXdZdwhKSJFGqPvzVJB8_7uaVG8ukl9UoXEOMY9DZHsKap5sCxbqEGK6BBGuysNGSyuBFdw' },
            { title: 'Wedding Special', desc: 'For the season', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhEER4pNvjdDwqSMWVDo7GntR60U3zWTHjcCUpYpg6m6oa0IEyWeuXrpcUdwA9dWNb3ZGl2H5GStlQzS4RWzaAclQj2VuB4bbM2c0UKSdgt0FU8avppJEXBEaSkoreAIQS0cPAAZYJK9dDPb8LXbLYMTRRps0s0NAVXd01F5yJ5gXULycCxGCA-U660a0WPS2eq-FMdOgxqEdQidDjSmQUOhYv2yWi1zEcs750KsZt-e5LxrQleJ4nknzAQbqJwWRBkwDLdFFkxTw' },
            { title: 'Devotional Morning', desc: 'Start with peace', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4EKsEz9udUPtCDTrtX5-sG6RpXwpv34IuH6q5r9VreqB8aQV7MH4qVcR_aZee2ze4RQkLCaajaVM9PLp7r33ppAENIzPsqd4aFlsnY-ApwSjIc79kzHpV2HsyrjdmVEFdWRdI8xD8MCk_8n6TMGxz6uihvU6wB914TM1i0iYf6__hnxRx64DDy0NPAl_x8F1wUHaTan5mFRokLV-kdPqMq6WW2a_w2_mcGPG8dJVCaFNP9KfcJeCOvU7W2mKPESHiE-6KVPd2T_c' },
            { title: 'Romantic Evenings', desc: 'Best love songs', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBZSOwK9oye0yWK3q8CDaPxglj5Ww2pTgOxxTQNbfv1xs0Kl6nJvCFcILMU52Ucb6mHbHgJ8pEFd7yJ4qjY3ngAZo8E3UTOMimJCpRYgvFakkOySEVBiREQJmDDgrVk6MNTrEifydIrmUUMMRO1dPXT94LvVaWEt4f7fZiXldsUl_nrKDWF6ebaypcio2vnxJWqrBU8N7WnsgtDbtvMnHuCollg9J0osHEJqGkz0Y38hb2i0y__FkwkNQ-QCs23k3oXYXPUh3Gp7Y' }
        ];

        for (const p of playlists) {
            const [check] = await connection.query('SELECT id FROM playlists WHERE name = ?', [p.title]);
            let pId;
            if (check.length === 0) {
                const [res] = await connection.query(
                    'INSERT INTO playlists (user_id, name, description, cover_image_url, is_public) VALUES (?, ?, ?, ?, ?)',
                    [ownerId, p.title, p.desc, p.img, true]
                );
                pId = res.insertId;
            } else {
                pId = check[0].id;
            }

            // Link random songs
            for (const sId of songIds) {
                await connection.query('INSERT IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)', [pId, sId]);
            }
        }

        console.log('Music Seed Complete.');
        process.exit(0);

    } catch (e) {
        console.error('Seed Failed:', e);
        process.exit(1);
    }
}

seedMusic();
