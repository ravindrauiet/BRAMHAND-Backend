const { Queue, Worker } = require('bullmq');
const pool = require('../config/db');
const { transcodeToHLS } = require('./hlsTranscodeService');

const JOB_NAME = 'transcode';
const QUEUE_NAME = 'hls-transcode';
const DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: 100,
    removeOnFail: 50,
};

let transcodeDisabledReason = null;
let shutdownPromise = null;

/**
 * Build the ioredis-compatible connection options.
 * Supports three modes:
 *  1. REDIS_URL  - Upstash or any redis:// / rediss:// URL (recommended)
 *  2. REDIS_HOST / REDIS_PORT / REDIS_PASSWORD - separate vars (self-hosted Redis)
 *  3. Fallback - localhost:6379 (local dev)
 */
function buildConnection() {
    if (process.env.REDIS_URL) {
        const u = new URL(process.env.REDIS_URL);
        return {
            host: u.hostname,
            port: parseInt(u.port || '6379', 10),
            password: u.password ? decodeURIComponent(u.password) : undefined,
            // Upstash uses rediss:// so TLS is required.
            tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
            // Required by BullMQ when using Upstash.
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

function isRedisQuotaExceededError(err) {
    const message = (err && err.message) ? err.message : String(err || '');
    return /max requests limit exceeded/i.test(message);
}

function disableTranscoding(reason, err) {
    if (transcodeDisabledReason) {
        return shutdownPromise || Promise.resolve();
    }

    transcodeDisabledReason = reason;
    console.error(`[TranscodeQueue] Background HLS transcoding disabled: ${reason}`);
    if (err && err.message) {
        console.error('[TranscodeQueue] Root cause:', err.message);
    }

    shutdownPromise = Promise.allSettled([
        worker.close(),
        transcodeQueue.close(),
    ]).catch(() => undefined);

    return shutdownPromise;
}

const connection = buildConnection();

// Shared queue; producers push jobs here.
const transcodeQueue = new Queue(QUEUE_NAME, { connection });

// Worker processes one job at a time to avoid OOM on low-RAM servers.
const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
        const { videoId, s3Key } = job.data;
        console.log(`[TranscodeWorker] Job ${job.id} - videoId=${videoId}, key=${s3Key}`);

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
    if (isRedisQuotaExceededError(err)) {
        void disableTranscoding('Redis request quota exceeded.', err);
        return;
    }

    if (transcodeDisabledReason) {
        return;
    }

    console.error('[TranscodeWorker] Worker error:', err.message);
});

async function enqueueTranscodeJob(videoId, s3Key, jobOptions = {}) {
    if (transcodeDisabledReason) {
        return { queued: false, reason: transcodeDisabledReason };
    }

    try {
        const job = await transcodeQueue.add(
            JOB_NAME,
            { videoId, s3Key },
            { ...DEFAULT_JOB_OPTIONS, ...jobOptions }
        );

        return { queued: true, jobId: job.id };
    } catch (err) {
        if (isRedisQuotaExceededError(err)) {
            await disableTranscoding('Redis request quota exceeded.', err);
            return { queued: false, reason: transcodeDisabledReason };
        }

        throw err;
    }
}

function getTranscodeQueueState() {
    return {
        enabled: !transcodeDisabledReason,
        reason: transcodeDisabledReason,
    };
}

module.exports = {
    transcodeQueue,
    enqueueTranscodeJob,
    getTranscodeQueueState,
};
