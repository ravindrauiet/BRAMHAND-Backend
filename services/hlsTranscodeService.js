const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.AWS_BUCKET_NAME;

// Quality ladder: 240p → 360p → 480p → 720p
const QUALITY_VARIANTS = [
    { name: '240p', resolution: '426x240',  videoBitrate: '400k',  audioBitrate: '64k',  bandwidth: 528000  },
    { name: '360p', resolution: '640x360',  videoBitrate: '800k',  audioBitrate: '96k',  bandwidth: 928000  },
    { name: '480p', resolution: '854x480',  videoBitrate: '1200k', audioBitrate: '128k', bandwidth: 1376000 },
    { name: '720p', resolution: '1280x720', videoBitrate: '2500k', audioBitrate: '128k', bandwidth: 2676000 },
];

/**
 * Download an S3 object to a local temp file.
 */
async function downloadFromS3(s3Key, localPath) {
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(localPath);
        Body.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
    });
}

/**
 * Upload a single local file to S3.
 */
async function uploadFileToS3(localPath, s3Key) {
    const ext = path.extname(localPath);
    const contentType = ext === '.m3u8' ? 'application/x-mpegURL' : 'video/MP2T';
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: fs.createReadStream(localPath),
        ContentType: contentType,
    }));
}

/**
 * Recursively upload a local directory to S3 under the given prefix.
 */
async function uploadDirToS3(localDir, s3Prefix) {
    const entries = fs.readdirSync(localDir, { withFileTypes: true });
    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const s3Key = `${s3Prefix}/${entry.name}`;
        if (entry.isDirectory()) {
            await uploadDirToS3(localPath, s3Key);
        } else {
            await uploadFileToS3(localPath, s3Key);
        }
    }
}

/**
 * Transcode one quality variant using FFmpeg → HLS segments.
 * Output lands in <hlsOutputDir>/<variant.name>/
 */
function transcodeVariant(inputPath, hlsOutputDir, variant) {
    const variantDir = path.join(hlsOutputDir, variant.name);
    fs.mkdirSync(variantDir, { recursive: true });
    const playlistPath = path.join(variantDir, 'index.m3u8');

    const stderrLines = [];
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                // Map video stream (required) and audio stream (optional — ? means skip if absent)
                '-map',                    '0:v:0',
                '-map',                    '0:a:0?',
                '-vf',                     `scale=${variant.resolution}:force_original_aspect_ratio=decrease,pad=${variant.resolution}:(ow-iw)/2:(oh-ih)/2`,
                '-c:v',                    'libx264',
                '-b:v',                    variant.videoBitrate,
                '-c:a',                    'aac',
                '-b:a',                    variant.audioBitrate,
                '-hls_time',               '6',
                '-hls_playlist_type',      'vod',
                '-hls_segment_filename',   path.join(variantDir, 'seg%03d.ts'),
                '-preset',                 'fast',
                '-profile:v',              'main',
                '-level',                  '3.1',
            ])
            .output(playlistPath)
            .on('start', cmd => console.log(`[HLS][${variant.name}] FFmpeg cmd: ${cmd}`))
            .on('stderr', line => stderrLines.push(line))
            .on('progress', p => console.log(`[HLS][${variant.name}] ${Math.round(p.percent ?? 0)}%`))
            .on('end', () => {
                console.log(`[HLS][${variant.name}] Done.`);
                resolve(playlistPath);
            })
            .on('error', (err) => {
                // Print last 10 lines of FFmpeg stderr for diagnosis
                const detail = stderrLines.slice(-10).join('\n');
                console.error(`[HLS][${variant.name}] FFmpeg stderr:\n${detail}`);
                reject(new Error(`FFmpeg [${variant.name}]: ${err.message}`));
            })
            .run();
    });
}

/**
 * Build the HLS master manifest content.
 * Variant playlists are referenced as absolute S3 URLs so any CDN or direct
 * S3 request can independently fetch them without the manifest URL as a base.
 */
function buildMasterManifest(s3HlsBase) {
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    for (const v of QUALITY_VARIANTS) {
        content += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.resolution},NAME="${v.name}"\n`;
        content += `${s3HlsBase}/${v.name}/index.m3u8\n\n`;
    }
    return content;
}

/**
 * Main entry — called by the BullMQ worker.
 * Downloads source MP4, transcodes to 4 HLS variants, uploads to S3.
 * @param {number} videoId  DB row id
 * @param {string} s3Key    e.g. "videos/1700000000000-123456789.mp4"
 * @returns {string}        Master manifest S3 URL
 */
async function transcodeToHLS(videoId, s3Key) {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `hls-${videoId}-`));
    const inputPath = path.join(workDir, 'input.mp4');
    const hlsOutputDir = path.join(workDir, 'hls');
    fs.mkdirSync(hlsOutputDir);

    try {
        console.log(`[HLS] Downloading s3://${BUCKET}/${s3Key} → ${inputPath}`);
        await downloadFromS3(s3Key, inputPath);

        // Transcode each variant sequentially to avoid memory/CPU spikes
        for (const variant of QUALITY_VARIANTS) {
            await transcodeVariant(inputPath, hlsOutputDir, variant);
        }

        // Build and write master manifest
        const s3HlsBase = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/hls/${videoId}`;
        const masterContent = buildMasterManifest(s3HlsBase);
        const masterLocalPath = path.join(hlsOutputDir, 'master.m3u8');
        fs.writeFileSync(masterLocalPath, masterContent, 'utf8');

        console.log(`[HLS] Uploading HLS files to s3://${BUCKET}/hls/${videoId}/`);
        await uploadDirToS3(hlsOutputDir, `hls/${videoId}`);

        const masterUrl = `${s3HlsBase}/master.m3u8`;
        console.log(`[HLS] Complete. Master manifest: ${masterUrl}`);
        return masterUrl;
    } finally {
        // Always clean up temp dir to avoid filling /tmp
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
    }
}

module.exports = { transcodeToHLS };
