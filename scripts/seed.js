const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

function log(msg) {
    const time = new Date().toISOString();
    const entry = `[${time}] ${msg}`;
    console.log(entry);
    fs.appendFileSync('seed_log.txt', entry + '\n');
}

// Ensure log file is fresh
fs.writeFileSync('seed_log.txt', 'Starting Seed...\n');

async function seedDatabase() {
    log('Initializing Pool...');
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    let connection;
    try {
        log(`Connecting to ${config.database} at ${config.host}...`);
        connection = await mysql.createConnection(config);
        log('Connected successfully.');

        // --- Helpers ---
        const getCatId = async (name) => {
            const [rows] = await connection.query('SELECT id FROM video_categories WHERE name = ?', [name]);
            return rows.length ? rows[0].id : null;
        };
        const getVGenreId = async (name) => {
            const [rows] = await connection.query('SELECT id FROM video_genres WHERE name = ?', [name]);
            return rows.length ? rows[0].id : null;
        };
        const getMGenreId = async (name) => {
            const [rows] = await connection.query('SELECT id FROM music_genres WHERE name = ?', [name]);
            return rows.length ? rows[0].id : null;
        };

        // 1. Create Users
        log('Seeding Users...');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        const [existingUsers] = await connection.query("SELECT * FROM users WHERE email = 'creator@tirhuta.com'");
        let creatorId;

        if (existingUsers.length === 0) {
            const [userResult] = await connection.query(
                `INSERT INTO users (full_name, email, mobile_number, password_hash, is_creator, is_verified) 
             VALUES (?, ?, ?, ?, ?, ?)`,
                ['Ravi Kishan', 'creator@tirhuta.com', '9999999999', passwordHash, true, true]
            );
            creatorId = userResult.insertId;
            log('Creator created: ' + creatorId);

            await connection.query(
                `INSERT INTO creator_profiles (user_id, popular_name, is_monetization_enabled) 
             VALUES (?, ?, ?)`,
                [creatorId, 'Ravi Kishan Official', true]
            );
        } else {
            creatorId = existingUsers[0].id;
            log('Using existing creator: ' + creatorId);
        }

        // 2. Categories
        log('Seeding Categories...');
        const categories = ['Films', 'Web Series', 'Serials', 'Short Films', 'Geet-Naad', 'News', 'Bihar-Varta', 'Sahitya-sangam', 'Sanskritik', 'TV Shows', 'Kids'];
        for (const cat of categories) {
            await connection.query(`INSERT IGNORE INTO video_categories (name) VALUES (?)`, [cat]);
        }

        // 3. Genres
        log('Seeding Genres...');
        const vGenres = ['Drama', 'Comedy', 'Action', 'Devotional', 'Romance', 'Documentary', 'Sci-Fi', 'Fantasy', 'Animation'];
        for (const g of vGenres) {
            await connection.query(`INSERT IGNORE INTO video_genres (name) VALUES (?)`, [g]);
        }

        const mGenres = ['Maithili Folk', 'Devotional', 'Classic', 'Pop', 'Bhojpuri Hits'];
        for (const g of mGenres) {
            await connection.query(`INSERT IGNORE INTO music_genres (name) VALUES (?)`, [g]);
        }

        // 4. Videos
        log('Seeding Videos...');
        const videos = [
            // Series 1: Mithila Ke Angana
            {
                type: 'VIDEO',
                title: 'Mithila Ke Angana',
                desc: 'A story of resilience and nature suitable for all ages.',
                category: 'TV Shows',
                genre: 'Drama',
                url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                thumb: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAPQiMlHm5RE_2E-I0nJVbaBMYQR0gmdjMF8c0e_6iLlLWwisxKHZZDoCpxIMBCl9qlTBBuSkYrnTBMExXGXFitNjjli8zrMyJzkLeN5vFce2FAfLZ7Nz5nON_-IrKLJbCq98rjU4HfOyJzh-bggjPs4TZ_-u6LOITXATggfdotDNLJAl3ANiXI4Fw6AtuxuQ20M_66CIERqCqUbtB2wFiTqCLF75n8-jWReSNMdS01mQMGnkIZtRI5BZkJWoVc0tlhE2I2SBHERg',
                trending: true,
                featured: true,
                rating: 'U',
                year: '2025-01-01',
                tags: '4K, HDR, Family',
                cast: JSON.stringify([
                    { name: 'Kranti Prakash Jha', role: 'Ravi', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVOrClNbOMLP1N3zm9G_um03LFDpRG2rgAyKm_rQq0i1krlR_kl9bJXb0bSdJXQ2uEPLKM6pdLni9eqDgvniEkNurzbD-15_tHINdG11b6bSUgbJJ5tYZ5Vxp-M5_lyBcJXEyVkm6Fiw84Pm6PRWyjtUr1fgjchG6sqqZn1UtZnhT0o07icvmQLYMZvi3idu_HH4QDIaT874snAkDf4fbl0HDxYaOWAHyXID-ImGt94c4VG10KzHlfYuVIm5wQ-U4KPYT5t20f88k' },
                    { name: 'Aarti Puri', role: 'Sita', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYbTGpWngJoiRH05YM0bnipDj7Hv2pKzW3FG8wh2mIHla9_-u7mkCt9th4ZKGuHYi8dVC5OU3GkwCMIR0oUYUs7iwfTM9BwKgRJMfZfGuUPmzZv7LE6M-h6qxKzfBOhGnK8ID9Igi2skZVzv9wL6pdkz5TdkyrOjYYVDVGAUx-dFjRv6fN5b1dhhTS-ntnvDk_nNC6VCXY4hUAC13FRHnWpwvED2dU9rf8RR1Hd3FgTJd3xOvBn9689s4V7qlA_zxjdWF9WiM6wlc' }
                ]),
                crew: JSON.stringify([
                    { name: 'Nitin Chandra', role: 'Director', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAY77jEuHbB2cVM8jf4DIolIQ9cCIn4FmRKZi7IaWJOiFJd51DEbL6gutqyd8vk_FBqDEJFsOO3Stcwkd142Qyt7Q6fSz9SLJIHJJ-4T-IXoqFjuHl_mK76IMm_IaM1Hmvlm1rVPq8OsowEHgVMpo2xiI9q0IbLm5AITPxkzeSjc3v-g01c22wHDI0pZRAhCUSIyOTsuy20SS19iJZOqqPgICPozi1P240WzSDIdXfn9fIXlxAOKxA3bi7fUlf4puzJ5Q0kgkhTt0c' }
                ]),
                episodes: [
                    { title: 'The Return', desc: 'Ravi returns home.', duration: 2400, ep: 1, season: 1 },
                    { title: 'Old Recipes', desc: 'Grandma secret found.', duration: 1800, ep: 2, season: 1 },
                    { title: 'Competition', desc: 'A rival appears.', duration: 2500, ep: 3, season: 1 }
                ]
            },
            // Series 2: Elephant Dreams
            {
                type: 'VIDEO',
                title: 'Elephants Dream',
                desc: 'The first open movie from Blender Foundation.',
                category: 'Films',
                genre: 'Sci-Fi',
                url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                thumb: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
                trending: true,
                featured: true,
                rating: 'U/A 13+',
                year: '2006-03-24',
                tags: 'HD, Surreal, 3D',
                cast: JSON.stringify([
                    { name: 'Tygo Gernandt', role: 'Proog', img: 'https://via.placeholder.com/150' },
                    { name: 'Cas Jansen', role: 'Emo', img: 'https://via.placeholder.com/150' }
                ]),
                crew: JSON.stringify([
                    { name: 'Bassam Kurdali', role: 'Director', img: 'https://via.placeholder.com/150' }
                ]),
                episodes: [
                    { title: 'The Machine', desc: 'Exploring the machine.', duration: 653, ep: 1, season: 1 }
                ]
            },
            // Series 3: Sintel
            {
                type: 'VIDEO',
                title: 'Sintel',
                desc: 'A lonely young woman searches for a dragon.',
                category: 'Films',
                genre: 'Fantasy',
                url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
                thumb: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
                trending: true,
                featured: false,
                rating: 'PG',
                year: '2010-09-27',
                tags: '4K, Fantasy, Dragon',
                cast: JSON.stringify([
                    { name: 'Halina Reijn', role: 'Sintel', img: 'https://via.placeholder.com/150' },
                    { name: 'Thom Hoffman', role: 'Shaman', img: 'https://via.placeholder.com/150' }
                ]),
                crew: JSON.stringify([
                    { name: 'Colin Levy', role: 'Director', img: 'https://via.placeholder.com/150' }
                ]),
                episodes: [
                    { title: 'The Search', desc: 'Sintel begins her journey.', duration: 888, ep: 1, season: 1 }
                ]
            },
            // Series 4: Tears of Steel
            {
                type: 'VIDEO',
                title: 'Tears of Steel',
                desc: 'A story about a group of warriors and scientists.',
                category: 'Films',
                genre: 'Sci-Fi',
                url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                thumb: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
                trending: false,
                featured: true,
                rating: 'PG-13',
                year: '2012-09-26',
                tags: 'HD, Sci-Fi, Action',
                cast: JSON.stringify([
                    { name: 'Derek de Lint', role: 'Thom', img: 'https://via.placeholder.com/150' },
                    { name: 'Sergio Hasselbaink', role: 'Barney', img: 'https://via.placeholder.com/150' }
                ]),
                crew: JSON.stringify([
                    { name: 'Ian Hubert', role: 'Director', img: 'https://via.placeholder.com/150' }
                ]),
                episodes: [
                    { title: 'The Bridge', desc: 'The team assembles.', duration: 734, ep: 1, season: 1 }
                ]
            },
            // Series 5: Big Buck Bunny
            {
                type: 'VIDEO',
                title: 'Big Buck Bunny',
                desc: 'A giant rabbit meets some bullying rodents.',
                category: 'Kids',
                genre: 'Animation',
                url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                thumb: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
                trending: true,
                featured: false,
                rating: 'U',
                year: '2008-04-10',
                tags: 'HD, Animation, Comedy',
                cast: JSON.stringify([]),
                crew: JSON.stringify([
                    { name: 'Sacha Goedegebure', role: 'Director', img: 'https://via.placeholder.com/150' }
                ]),
                episodes: [
                    { title: 'The Payback', desc: 'Bunny gets even.', duration: 596, ep: 1, season: 1 }
                ]
            }
        ];

        for (const series of videos) {
            log(`Processing Series: ${series.title}`);
            const catId = await getCatId(series.category || 'Films') || 1;
            const genreId = await getVGenreId(series.genre || 'Drama') || 1;

            // 1. Insert SERIES CONTAINER
            const [res] = await connection.query(
                `INSERT INTO videos (
                    type, creator_id, category_id, genre_id, title, description, video_url, thumbnail_url, 
                    is_trending, is_featured, content_rating, release_date, duration, tags, 
                    cast, crew, quality_tags, audio_languages, series_id, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, TRUE)`,
                [
                    series.type, creatorId, catId, genreId, series.title, series.desc, series.url, series.thumb,
                    series.trending, series.featured,
                    series.rating,
                    series.year,
                    0,
                    series.tags,
                    series.cast,
                    series.crew,
                    series.tags,
                    'Hindi, Maithili'
                ]
            );

            const seriesId = res.insertId;
            log(`  Series ID: ${seriesId}`);

            // 2. Insert EPISODES
            if (series.episodes) {
                for (const ep of series.episodes) {
                    await connection.query(
                        `INSERT INTO videos (
                            type, creator_id, category_id, genre_id, title, description, video_url, thumbnail_url, 
                            is_trending, is_featured, content_rating, release_date, duration, tags, 
                            season_number, episode_number, series_id,
                            cast, crew, quality_tags, audio_languages, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
                        [
                            'VIDEO', creatorId, catId, genreId, ep.title, ep.desc, series.url, series.thumb,
                            false, false,
                            series.rating,
                            series.year,
                            ep.duration,
                            series.tags,
                            ep.season,
                            ep.ep,
                            seriesId,
                            series.cast,
                            series.crew,
                            'HD',
                            'Hindi'
                        ]
                    );
                    log(`    Episode ${ep.ep} inserted`);
                }
            }
        }

        log('Seeding Complete. Exiting...');
        await connection.end();
        process.exit(0);

    } catch (error) {
        log('Seeding CRASHED: ' + error.message);
        console.error(error);
        process.exit(1);
    }
}

seedDatabase();
