const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

// Configure AWS S3 Client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// File Filter (Video, Image & Audio)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'video/mp4', 'video/mkv', 'video/avi', 'video/quicktime',
        'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/aac'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only videos, images, and audio files are allowed.'), false);
    }
};

// Multer S3 Storage Configuration
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        // acl: 'public-read', // Removed as some buckets don't allow ACLs
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            let folder = 'thumbnails';
            if (file.fieldname === 'video') {
                folder = 'videos';
            } else if (file.fieldname === 'audio') {
                folder = 'audio';
            } else if (file.fieldname === 'profileImage') {
                folder = 'profile-images';
            }
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${folder}/${uniqueSuffix}${ext}`);
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5 GB limit
        fieldSize: 50 * 1024 * 1024, // 25 MB field value limit (increased for huge JSONs)
        fields: 100, // Max number of non-file fields (Increased from 20)
        fieldNameSize: 200 // Max field name size
    }
});

module.exports = upload;
