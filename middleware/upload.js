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

// File Filter (Video & Image)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'video/mp4', 'video/mkv', 'video/avi', 'video/quicktime',
        'image/jpeg', 'image/png', 'image/webp', 'image/jpg'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only videos and images are allowed.'), false);
    }
};

// Multer S3 Storage Configuration
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const folder = file.fieldname === 'video' ? 'videos' : 'thumbnails';
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${folder}/${uniqueSuffix}${ext}`);
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500 MB limit
    }
});

module.exports = upload;
