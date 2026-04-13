/**
 * retroTranscode.js
 * One-time script to enqueue HLS transcode jobs for all existing videos
 * that were uploaded before HLS support was added.
 *
 * Usage: node backend/scripts/retroTranscode.js
 *
 * Prerequisites:
 *  - Run migration 003_add_hls_support.sql first
 *  - Redis must be running (same config as the main server)
 *  - .env must be loaded (dotenv is called at top of this script)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = require('../config/db');
const { transcodeQueue } = require('../services/transcodeQueue');

async function main() {
    try {
        const [rows] = await pool.query(
            `SELECT id, video_url
             FROM videos
             WHERE hls_url IS NULL
               AND transcode_status = 'pending'
               AND video_url IS NOT NULL
               AND video_url != ''
             ORDER BY id ASC`
        );

        console.log(`Found ${rows.length} video(s) pending HLS transcoding.`);

        let queued = 0;
        let skipped = 0;

        for (const row of rows) {
            try {
                // Extract S3 key from the full URL
                // e.g. "https://bucket.s3.region.amazonaws.com/videos/file.mp4" → "videos/file.mp4"
                const url = new URL(row.video_url);
                const s3Key = url.pathname.replace(/^\//, '');

                if (!s3Key.startsWith('videos/')) {
                    console.warn(`  Skip videoId=${row.id}: URL doesn't look like an S3 key (${row.video_url})`);
                    skipped++;
                    continue;
                }

                await transcodeQueue.add(
                    'transcode',
                    { videoId: row.id, s3Key },
                    {
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 60000 },
                        removeOnComplete: 100,
                        removeOnFail: 50,
                    }
                );

                console.log(`  Queued videoId=${row.id} (${s3Key})`);
                queued++;
            } catch (err) {
                console.error(`  Error queuing videoId=${row.id}:`, err.message);
                skipped++;
            }
        }

        console.log(`\nDone. Queued: ${queued}, Skipped: ${skipped}`);
        console.log('The background worker will process them one at a time.');
        console.log('Monitor progress: SELECT id, transcode_status, hls_url FROM videos;');

        // Give the queue a moment to accept all jobs before exiting
        await new Promise(r => setTimeout(r, 1000));
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

main();
