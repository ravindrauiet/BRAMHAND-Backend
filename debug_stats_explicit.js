const mysql = require('mysql2/promise');
const fs = require('fs');

async function runDebug() {
    let connection;
    try {
        console.log('--- DEBUG VIDEO STATS (EXPLICIT) ---');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'admin',
            password: 'Ravindra@9354',
            database: 'video_streaming_db'
        });

        let output = '';
        output += '--- DEBUG VIDEO STATS ---\\n';

        // 1. Group by Type and Status
        const [rows] = await connection.query(`
            SELECT type, is_active, COUNT(*) as count, SUM(views_count) as total_views 
            FROM videos 
            GROUP BY type, is_active
        `);

        output += JSON.stringify(rows, null, 2) + '\\n';

        // 2. Total Stats
        const [total] = await connection.query(`
            SELECT COUNT(*) as total_videos, SUM(views_count) as total_views_all 
            FROM videos
        `);
        output += 'TOTALS: ' + JSON.stringify(total[0], null, 2) + '\\n';

        fs.writeFileSync('debug_stats_output.txt', output);
        console.log('Output written to debug_stats_output.txt');

    } catch (err) {
        fs.writeFileSync('debug_stats_output.txt', 'ERROR: ' + err.toString());
        console.error('ERROR:', err);
    } finally {
        if (connection) await connection.end();
    }
}

runDebug();
