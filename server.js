console.log('Starting server.js...');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
console.log('Loading DB config...');
const pool = require('./config/db'); // Test DB connection

// Load Routes
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const musicRoutes = require('./routes/musicRoutes');
const userRoutes = require('./routes/userRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const commentRoutes = require('./routes/commentRoutes');
const seriesRoutes = require('./routes/seriesRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for credentials support
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // List of allowed origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://tirhuta.com',
            'https://www.tirhuta.com',
            'https://admin.tirhuta.com',
            process.env.FRONTEND_URL,
            process.env.ADMIN_URL
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Allow all origins in development
            if (process.env.NODE_ENV === 'development') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Route
app.get('/', (req, res) => {
    res.send('Tirhuta Video Streaming Backend is Running!');
});

// Routes
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/videos', '/videos'], videoRoutes);
app.use(['/api/music', '/music'], musicRoutes);
app.use(['/api/user', '/user', '/api/users', '/users'], userRoutes);
app.use(['/api/creator', '/creator'], creatorRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);
app.use(['/api/comments', '/comments'], commentRoutes);
app.use(['/api/series', '/series'], seriesRoutes);
app.use(['/api/admin', '/admin'], require('./routes/adminRoutes'));

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

console.log('Attempting to listen on port ' + PORT);
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Increase timeout for large video uploads (30 minutes)
server.timeout = 50 * 60 * 1000;
