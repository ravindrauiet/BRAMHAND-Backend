require('dotenv').config();
const pool = require('./config/db');

async function runDebug() {
    try {
        console.log('--- DEBUG VIDEO STATS ---');

        // 1. Group by Type and Status
        const [rows] = await pool.query(`
            SELECT type, is_active, COUNT(*) as count, SUM(views_count) as total_views 
            FROM videos 
            GROUP BY type, is_active
        `);

        console.table(rows);

        // 2. Total Stats
        const [total] = await pool.query(`
            SELECT COUNT(*) as total_videos, SUM(views_count) as total_views_all 
            FROM videos
        `);
        console.log('TOTALS:', total[0]);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runDebug();
