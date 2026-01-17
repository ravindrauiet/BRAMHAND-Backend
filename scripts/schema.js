const schemaSql = `
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile_number VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    profile_image VARCHAR(512),
    is_creator BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    content_language VARCHAR(50) DEFAULT 'Hindi',
    app_language VARCHAR(50) DEFAULT 'English',
    notification_enabled BOOLEAN DEFAULT TRUE,
    auto_play BOOLEAN DEFAULT TRUE,
    video_quality VARCHAR(20) DEFAULT 'Auto',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OTPs
CREATE TABLE IF NOT EXISTS otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile_or_email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creator Profiles
CREATE TABLE IF NOT EXISTS creator_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    popular_name VARCHAR(100) NOT NULL,
    pan_card VARCHAR(20),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    account_holder_name VARCHAR(100),
    upi_id VARCHAR(50),
    monetization_percentage DECIMAL(5, 2) DEFAULT 0.00,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    is_monetization_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Video Categories
CREATE TABLE IF NOT EXISTS video_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_hindi VARCHAR(100),
    icon VARCHAR(512),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video Genres
CREATE TABLE IF NOT EXISTS video_genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_hindi VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos (Includes Reels via type ENUM)
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('VIDEO', 'REEL') DEFAULT 'VIDEO',
    creator_id INT NOT NULL,
    category_id INT NOT NULL,
    genre_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(512) NOT NULL,
    thumbnail_url VARCHAR(512),
    duration INT,
    file_size BIGINT,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    language VARCHAR(50) DEFAULT 'Hindi',
    content_rating ENUM('U', 'UA', 'A', 'S') DEFAULT 'U',
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES video_categories(id),
    FOREIGN KEY (genre_id) REFERENCES video_genres(id)
);

-- Music Genres
CREATE TABLE IF NOT EXISTS music_genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_hindi VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Songs
CREATE TABLE IF NOT EXISTS songs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    genre_id INT NOT NULL,
    audio_url VARCHAR(512) NOT NULL,
    cover_image_url VARCHAR(512),
    duration INT,
    file_size BIGINT,
    plays_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    language VARCHAR(50) DEFAULT 'Hindi',
    release_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (genre_id) REFERENCES music_genres(id)
);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(512),
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Playlist Songs (Junction)
CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id INT NOT NULL,
    song_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'GENERAL',
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Interactions: Video Likes
CREATE TABLE IF NOT EXISTS video_likes (
    user_id INT NOT NULL,
    video_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Interactions: Video Views
CREATE TABLE IF NOT EXISTS video_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    video_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Interactions: Song Likes
CREATE TABLE IF NOT EXISTS song_likes (
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, song_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);
`;

module.exports = schemaSql;
