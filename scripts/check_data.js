const pool = require('../config/db');

async function check() {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM videos');
        console.log('Total Videos:', rows[0].count);

        const [videos] = await pool.query('SELECT id, title, type, is_active, series_id FROM videos LIMIT 5');
        console.log('Sample Videos:', videos);

        const [activeCount] = await pool.query('SELECT COUNT(*) as count FROM videos WHERE is_active = 1');
        console.log('Active Videos:', activeCount[0].count);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
