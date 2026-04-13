const { Queue, Worker } = require('bullmq');
const pool = require('../config/db');
const { transcodeToHLS } = require('./hlsTranscodeService');

/**
 * Build the ioredis-compatible connection options.
 * Supports three modes:
 *  1. REDIS_URL  — Upstash or any redis:// / rediss:// URL  (recommended)
 *  2. REDIS_HOST / REDIS_PORT / REDIS_PASSWORD — separate vars (self-hosted Redis)
 *  3. Fallback   — localhost:6379 (local dev)
 */
function buildConnection() {
    if (process.env.REDIS_URL) {
        const u = new URL(process.env.REDIS_URL);
        return {
            host: u.hostname,
            port: parseInt(u.port || '6379', 10),
            password: u.password ? decodeURIComponent(u.password) : undefined,
            // Upstash uses "rediss://" (double-s) = TLS required
            tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
            // Required by BullMQ when using Upstash
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
        };
    }
    return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
    };
}

const connection = buildConnection();

// Shared queue — producers (uploadVideo) push jobs here
const transcodeQueue = new Queue('hls-transcode', { connection });

// Worker processes one job at a time (concurrency:1) to avoid OOM on low-RAM servers.
// For servers with 8+ CPUs you can raise concurrency and use Promise.all in
// hlsTranscodeService for parallel variant encoding.
const worker = new Worker(
    'hls-transcode',
    async (job) => {
        const { videoId, s3Key } = job.data;
        console.log(`[TranscodeWorker] Job ${job.id} — videoId=${videoId}, key=${s3Key}`);

        await pool.query(
            'UPDATE videos SET transcode_status = ? WHERE id = ?',
            ['processing', videoId]
        );

        try {
            const hlsUrl = await transcodeToHLS(videoId, s3Key);

            await pool.query(
                'UPDATE videos SET hls_url = ?, transcode_status = ?, updated_at = NOW() WHERE id = ?',
                [hlsUrl, 'done', videoId]
            );
            console.log(`[TranscodeWorker] Job ${job.id} done. hls_url=${hlsUrl}`);
            return hlsUrl;
        } catch (err) {
            const errMsg = (err.message || String(err)).substring(0, 1000);
            await pool.query(
                'UPDATE videos SET transcode_status = ?, transcode_error = ?, updated_at = NOW() WHERE id = ?',
                ['failed', errMsg, videoId]
            );
            // Re-throw so BullMQ marks the job failed and applies retry backoff
            throw err;
        }
    },
    {
        connection,
        concurrency: 1,
    }
);

worker.on('completed', (job) => {
    console.log(`[TranscodeWorker] Job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
    console.error(`[TranscodeWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on('error', (err) => {
    console.error('[TranscodeWorker] Worker error:', err.message);
});

module.exports = { transcodeQueue };
